// supabase/functions/kie-mp4-callback/index.ts
// Webhook público — recibe callback de KIE cuando el MP4 visualizer está listo.
// Descarga el vídeo y lo sube permanentemente a social-promo-videos bucket
// (las URLs de KIE expiran a los 14 días).
// Actualiza ai_generations.mp4_url y mp4_status = 'completed'.
//
// verify_jwt = false
// Deploy: supabase functions deploy kie-mp4-callback

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const BUCKET = "social-promo-videos";
const FEATURE_KEY = "mp4_visualizer";

serve(async (req) => {
  if (req.method === "OPTIONS") return ok({});

  try {
    const url = new URL(req.url);
    const callbackToken = url.searchParams.get("token");

    const body = await req.json().catch(() => ({}));
    console.log("[kie-mp4-callback] received", {
      code: body?.code,
      taskId: body?.data?.task_id,
    });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const taskId = body?.data?.task_id || body?.data?.taskId;

    // ── Localizar log row ──────────────────────────────────────────────────────
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
        .eq("feature_key", FEATURE_KEY)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      logRow = data;
    }

    if (!logRow) {
      console.warn("[kie-mp4-callback] no matching log row", { taskId, token: callbackToken });
      return ok({ warning: "no log row" });
    }

    // ── Validar token ──────────────────────────────────────────────────────────
    // FIX 2026-07-19 (security scan): si se omitia el parametro `token` en la
    // URL, la validacion se saltaba entera (aunque el log row SI tuviera un
    // callback_token esperado), permitiendo a cualquiera con un taskId
    // adivinado o filtrado marcar una generacion como completada sin token.
    if (!logRow.callback_token || logRow.callback_token !== callbackToken) {
      console.warn("[kie-mp4-callback] token mismatch or missing");
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Idempotencia ───────────────────────────────────────────────────────────
    if (logRow.status === "completed") {
      console.log("[kie-mp4-callback] already completed", logRow.id);
      return ok({ already: true });
    }

    const logId = logRow.id as string;
    const userId = logRow.user_id as string;
    const requestPayload = logRow.request_payload as Record<string, unknown> | null;
    const generationId = requestPayload?.generation_id as string | undefined;

    // ── KIE reporta fallo ──────────────────────────────────────────────────────
    const code = body?.code;
    if (code && code !== 200 && code !== 0) {
      console.error("[kie-mp4-callback] KIE failure", { code, msg: body?.msg });
      await supabase
        .from("ai_generation_logs")
        .update({
          status: "failed",
          error_message: body?.msg || `KIE code ${code}`,
          response_payload: body,
        })
        .eq("id", logId);

      if (generationId) {
        await supabase
          .from("ai_generations")
          .update({ mp4_status: "failed" })
          .eq("id", generationId);
      }
      return ok({ ok: false });
    }

    // ── Extraer video_url del callback ────────────────────────────────────────
    const kieVideoUrl: string | null =
      body?.data?.video_url ||
      body?.data?.videoUrl ||
      body?.data?.mp4_url ||
      null;

    if (!kieVideoUrl) {
      console.warn("[kie-mp4-callback] no video_url in payload", JSON.stringify(body).slice(0, 400));
      await supabase
        .from("ai_generation_logs")
        .update({
          status: "failed",
          error_message: "No video_url in KIE callback",
          response_payload: body,
        })
        .eq("id", logId);

      if (generationId) {
        await supabase
          .from("ai_generations")
          .update({ mp4_status: "failed" })
          .eq("id", generationId);
      }
      return ok({ warning: "no video_url" });
    }

    // ── Descargar MP4 y subir a Supabase Storage (URLs KIE expiran en 14 días) ─
    let permanentUrl = kieVideoUrl;

    try {
      console.log("[kie-mp4-callback] downloading from KIE...", { kieVideoUrl });
      const videoRes = await fetch(kieVideoUrl, { signal: AbortSignal.timeout(60_000) });
      if (!videoRes.ok) throw new Error(`Fetch failed: ${videoRes.status}`);

      const videoBuffer = await videoRes.arrayBuffer();
      const storagePath = `mp4-visualizers/${userId}/${generationId ?? logId}.mp4`;

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, videoBuffer, {
          contentType: "video/mp4",
          upsert: true,
        });

      if (uploadErr) {
        console.error("[kie-mp4-callback] storage upload failed", uploadErr.message);
      } else {
        const { data: publicUrlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(storagePath);
        permanentUrl = publicUrlData.publicUrl;
        console.log("[kie-mp4-callback] stored in Supabase", { storagePath, permanentUrl });
      }
    } catch (downloadErr) {
      console.error("[kie-mp4-callback] download/upload error — using KIE URL as fallback", downloadErr);
    }

    // ── Marcar log como completado ─────────────────────────────────────────────
    await supabase
      .from("ai_generation_logs")
      .update({
        status: "completed",
        output_url: permanentUrl,
        response_payload: body,
      })
      .eq("id", logId);

    // ── Actualizar ai_generations ──────────────────────────────────────────────
    if (generationId) {
      await supabase
        .from("ai_generations")
        .update({
          mp4_url: permanentUrl,
          mp4_status: "completed",
        })
        .eq("id", generationId);

      console.log("[kie-mp4-callback] ai_generations updated", { generationId, permanentUrl });
    }

    console.log("[kie-mp4-callback] completed", { logId, permanentUrl });
    return ok({ ok: true, logId, mp4_url: permanentUrl });

  } catch (err) {
    console.error("[kie-mp4-callback] fatal", err);
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
