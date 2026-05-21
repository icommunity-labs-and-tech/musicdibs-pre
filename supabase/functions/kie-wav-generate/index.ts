// supabase/functions/kie-wav-generate/index.ts
// Convierte un audio MP3 a WAV usando KIE Suno API.
// Gratuito para el usuario (coste KIE ~$0.002, lo asumimos nosotros).
// NO almacena el WAV en Supabase Storage: la URL temporal de KIE es suficiente
// para que el navegador lance la descarga inmediatamente.
//
// Deploy: supabase functions deploy kie-wav-generate

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-idempotency-key",
};

const FEATURE_KEY = "wav_convert";

serve(async (req) => {
  if (req.method === "OPTIONS") return json(null, 204, true);

  try {
    const KIE_API_KEY = Deno.env.get("KIE_API_KEY");
    if (!KIE_API_KEY) return json({ error: "KIE_API_KEY not configured" }, 500);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

    // ── Autenticar usuario ─────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const supabaseAdmin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ── Parsear body ───────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const { audio_url } = body || {};

    if (!audio_url || typeof audio_url !== "string") {
      return json({ error: "audio_url is required" }, 400);
    }

    // ── Idempotency ────────────────────────────────────────────────────────────
    const idempotencyKey: string =
      req.headers.get("x-idempotency-key") ||
      body?.idempotencyKey ||
      `wav_${user.id}_${Date.now()}`;

    // ── Crear log row ──────────────────────────────────────────────────────────
    const callbackToken =
      crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const callBackUrl = `${SUPABASE_URL}/functions/v1/kie-wav-callback?token=${callbackToken}`;

    const { data: logInsert, error: logErr } = await supabaseAdmin
      .from("ai_generation_logs")
      .insert({
        user_id: user.id,
        feature_key: FEATURE_KEY,
        provider: "kie_suno",
        model: "convert-to-wav",
        status: "pending",
        idempotency_key: idempotencyKey,
        callback_token: callbackToken,
        user_credits_charged: 0, // Gratuito para el usuario
        request_payload: { audio_url },
      })
      .select("id")
      .single();

    if (logErr || !logInsert) {
      return json({ error: "log_insert_failed", message: logErr?.message }, 500);
    }

    const logId = logInsert.id;

    // ── Llamar a KIE: convert-to-wav ──────────────────────────────────────────
    const kiePayload = {
      audioUrl: audio_url,
      callBackUrl,
    };

    console.log("[kie-wav-generate] calling KIE convert-to-wav", { logId });

    const kieRes = await fetch("https://api.kie.ai/api/v1/generate/convert-to-wav", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KIE_API_KEY}`,
      },
      body: JSON.stringify(kiePayload),
    });

    const kieBody = await kieRes.json().catch(() => ({ code: -1, msg: "parse error" }));
    console.log("[kie-wav-generate] KIE response", { status: kieRes.status, code: kieBody?.code });

    if (!kieRes.ok || (kieBody?.code !== 200 && kieBody?.code !== 0)) {
      await supabaseAdmin
        .from("ai_generation_logs")
        .update({
          status: "failed",
          error_message: kieBody?.msg || `KIE HTTP ${kieRes.status}`,
          response_payload: kieBody,
        })
        .eq("id", logId);

      return json({
        error: "kie_error",
        message: kieBody?.msg || `KIE HTTP ${kieRes.status}`,
      }, 502);
    }

    // Guardar taskId si KIE lo devuelve inmediatamente
    const wavTaskId = kieBody?.data?.task_id || kieBody?.data?.taskId || null;
    if (wavTaskId) {
      await supabaseAdmin
        .from("ai_generation_logs")
        .update({ provider_task_id: wavTaskId })
        .eq("id", logId);
    }

    // Caso especial: KIE devuelve WAV URL síncronamente (sin callback)
    const syncWavUrl =
      kieBody?.data?.wav_url ||
      kieBody?.data?.wavUrl ||
      kieBody?.data?.audio_url ||
      kieBody?.data?.audioUrl ||
      null;

    if (syncWavUrl) {
      await supabaseAdmin
        .from("ai_generation_logs")
        .update({ status: "completed", output_url: syncWavUrl, response_payload: kieBody })
        .eq("id", logId);
      console.log("[kie-wav-generate] sync WAV URL", { logId, syncWavUrl });
      return json({ ok: true, logId, status: "completed", wav_url: syncWavUrl });
    }

    console.log("[kie-wav-generate] async WAV queued", { logId, wavTaskId });
    return json({
      ok: true,
      logId,
      status: "pending",
      message: "Conversión WAV en curso. Estará lista en unos segundos.",
    });

  } catch (err) {
    console.error("[kie-wav-generate] fatal", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200, noBody = false): Response {
  if (noBody) {
    return new Response(null, { status, headers: corsHeaders });
  }
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
