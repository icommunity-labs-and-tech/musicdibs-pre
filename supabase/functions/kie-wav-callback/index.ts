// supabase/functions/kie-wav-callback/index.ts
// Webhook público — recibe el callback de KIE cuando la conversión WAV termina.
// NO sube el WAV a Supabase Storage: la URL temporal de KIE se pasa directamente
// al navegador para descarga inmediata.
//
// verify_jwt = false  ← añadir en supabase/config.toml
// Deploy: supabase functions deploy kie-wav-callback

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return ok({});

  try {
    const url = new URL(req.url);
    const callbackToken = url.searchParams.get("token");

    const body = await req.json().catch(() => ({}));
    console.log("[kie-wav-callback] received", { code: body?.code, type: body?.data?.callbackType });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const taskId = body?.data?.task_id || body?.data?.taskId;
    const callbackType = body?.data?.callbackType || body?.data?.callback_type;

    // Ignorar callbacks intermedios
    if (callbackType && callbackType !== "complete") {
      console.log("[kie-wav-callback] ignoring intermediate callback", { taskId, callbackType });
      return ok({ ignored: callbackType });
    }

    // ── Localizar fila en ai_generation_logs ───────────────────────────────────
    let logRow: Record<string, unknown> | null = null;

    if (callbackToken) {
      const { data } = await supabase
        .from("ai_generation_logs")
        .select("*")
        .eq("callback_token", callbackToken)
        .maybeSingle();
      logRow = data;
    }

    if (!logRow && taskId) {
      const { data } = await supabase
        .from("ai_generation_logs")
        .select("*")
        .eq("provider_task_id", taskId)
        .eq("feature_key", "wav_convert")
        .maybeSingle();
      logRow = data;
    }

    if (!logRow) {
      console.warn("[kie-wav-callback] no matching log row", { taskId, token: callbackToken });
      return ok({ warning: "no log row" });
    }

    // ── Validar token ──────────────────────────────────────────────────────────
    if (!logRow.callback_token || logRow.callback_token !== callbackToken) {
      console.warn("[kie-wav-callback] token mismatch");
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Idempotencia ───────────────────────────────────────────────────────────
    if (logRow.status === "completed") {
      console.log("[kie-wav-callback] already completed", logRow.id);
      return ok({ already: true });
    }

    const logId = logRow.id as string;
    const code = body?.code;

    // ── KIE reporta fallo ──────────────────────────────────────────────────────
    if (code && code !== 200 && code !== 0) {
      console.error("[kie-wav-callback] KIE failure code", code);
      await supabase
        .from("ai_generation_logs")
        .update({
          status: "failed",
          error_message: body?.msg || `KIE code ${code}`,
          response_payload: body,
        })
        .eq("id", logId);
      return ok({ ok: false });
    }

    // ── Extraer WAV URL ────────────────────────────────────────────────────────
    // KIE puede devolver el WAV bajo distintos campos según versión del endpoint.
    const tracks: Array<Record<string, unknown>> = Array.isArray(body?.data?.data)
      ? body.data.data
      : [];

    const firstTrack = tracks[0] || body?.data || {};
    const wavUrl: string | null =
      (firstTrack.wav_url as string) ||
      (firstTrack.wavUrl as string) ||
      (firstTrack.audio_url as string) ||
      (firstTrack.audioUrl as string) ||
      (body?.data?.wav_url as string) ||
      (body?.data?.wavUrl as string) ||
      (body?.data?.audio_url as string) ||
      (body?.data?.audioUrl as string) ||
      null;

    if (!wavUrl) {
      console.warn("[kie-wav-callback] no wav_url in payload", JSON.stringify(body).slice(0, 400));
      await supabase
        .from("ai_generation_logs")
        .update({
          status: "failed",
          error_message: "No wav_url in KIE response",
          response_payload: body,
        })
        .eq("id", logId);
      return ok({ warning: "no wav_url" });
    }

    // ── Marcar completado — NO subimos a Storage, URL de KIE es suficiente ─────
    await supabase
      .from("ai_generation_logs")
      .update({
        status: "completed",
        output_url: wavUrl,
        response_payload: body,
      })
      .eq("id", logId);

    console.log("[kie-wav-callback] completed", { logId, wavUrl });
    return ok({ ok: true, logId, wavUrl });

  } catch (err) {
    console.error("[kie-wav-callback] fatal", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function ok(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
