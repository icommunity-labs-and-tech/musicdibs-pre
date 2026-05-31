// supabase/functions/kie-mp4-generate/index.ts
// Genera un MP4 visualizer para una canción ya generada con KIE/Suno.
// Extrae taskId + audioId del response_payload guardado en ai_generations.
// Llama a KIE /api/v1/mp4/generate y registra el job en ai_generation_logs.
// El callback (kie-mp4-callback) descargará el vídeo, lo subirá a
// social-promo-videos y actualizará ai_generations.mp4_url + mp4_status.
//
// verify_jwt = true  (requiere usuario autenticado)
// Deploy: supabase functions deploy kie-mp4-generate

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-idempotency-key",
};

const FEATURE_KEY = "mp4_visualizer";

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
    const { generation_id } = body || {};

    if (!generation_id || typeof generation_id !== "string") {
      return json({ error: "generation_id is required" }, 400);
    }

    // ── Cargar fila de ai_generations ──────────────────────────────────────────
    const { data: gen, error: genErr } = await supabaseAdmin
      .from("ai_generations")
      .select("id, user_id, provider_task_id, variant_index, mp4_status, mp4_url, response_payload, prompt")
      .eq("id", generation_id)
      .eq("user_id", user.id) // Seguridad: sólo el dueño
      .maybeSingle();

    if (genErr || !gen) {
      return json({ error: "generation_not_found" }, 404);
    }

    // ── Idempotencia: si ya existe MP4, devolver URL directamente ─────────────
    if (gen.mp4_status === "completed" && gen.mp4_url) {
      console.log("[kie-mp4-generate] already completed", { generation_id, mp4_url: gen.mp4_url });
      return json({ ok: true, status: "completed", mp4_url: gen.mp4_url });
    }

    // ── Si ya está en proceso, no lanzar de nuevo ──────────────────────────────
    if (gen.mp4_status === "processing" || gen.mp4_status === "pending") {
      console.log("[kie-mp4-generate] already in progress", { generation_id });
      return json({ ok: true, status: gen.mp4_status, message: "Vídeo ya en generación" });
    }

    // ── Validar que la generación fue por KIE (tiene provider_task_id) ─────────
    if (!gen.provider_task_id) {
      return json({
        error: "not_supported",
        message: "MP4 visualizer solo disponible para canciones generadas con KIE/Suno",
      }, 422);
    }

    // ── Extraer audioId del response_payload ──────────────────────────────────
    // KIE devuelve 2 variantes en response_payload.data.data[]
    // variant_index indica cuál corresponde a esta fila
    const tracks: Array<{ id: string }> =
      gen.response_payload?.data?.data || [];

    const variantIndex = gen.variant_index ?? 0;
    const audioId: string | undefined = tracks[variantIndex]?.id;

    if (!audioId) {
      console.error("[kie-mp4-generate] audioId not found in response_payload", {
        generation_id,
        variantIndex,
        tracksCount: tracks.length,
      });
      return json({
        error: "audio_id_not_found",
        message: "No se encontró el audioId en el payload de la generación original",
      }, 422);
    }

    console.log("[kie-mp4-generate] found audioId", {
      generation_id,
      taskId: gen.provider_task_id,
      audioId,
      variantIndex,
    });

    // ── Idempotency key ────────────────────────────────────────────────────────
    const idempotencyKey: string =
      req.headers.get("x-idempotency-key") ||
      body?.idempotencyKey ||
      `mp4_${generation_id}_${variantIndex}`;

    // ── Crear log row ──────────────────────────────────────────────────────────
    const callbackToken =
      crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const callBackUrl = `${SUPABASE_URL}/functions/v1/kie-mp4-callback?token=${callbackToken}`;

    const { data: logInsert, error: logErr } = await supabaseAdmin
      .from("ai_generation_logs")
      .insert({
        user_id: user.id,
        feature_key: FEATURE_KEY,
        provider: "kie_suno",
        model: "mp4-visualizer",
        status: "pending",
        idempotency_key: idempotencyKey,
        callback_token: callbackToken,
        user_credits_charged: 0, // No cobramos créditos al usuario por el MP4
        request_payload: {
          generation_id,
          taskId: gen.provider_task_id,
          audioId,
          variantIndex,
        },
      })
      .select("id")
      .single();

    if (logErr || !logInsert) {
      return json({ error: "log_insert_failed", message: logErr?.message }, 500);
    }

    const logId = logInsert.id;

    // ── Marcar generación como en proceso ──────────────────────────────────────
    await supabaseAdmin
      .from("ai_generations")
      .update({ mp4_status: "processing" })
      .eq("id", generation_id);

    // ── Llamar a KIE: mp4/generate ─────────────────────────────────────────────
    const kiePayload = {
      taskId: gen.provider_task_id,
      audioId,
      callBackUrl,
      domainName: "musicdibs.com",
    };

    console.log("[kie-mp4-generate] calling KIE mp4/generate", { logId, taskId: gen.provider_task_id, audioId });

    const kieRes = await fetch("https://api.kie.ai/api/v1/mp4/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KIE_API_KEY}`,
      },
      body: JSON.stringify(kiePayload),
    });

    const kieBody = await kieRes.json().catch(() => ({ code: -1, msg: "parse error" }));
    console.log("[kie-mp4-generate] KIE response", { status: kieRes.status, code: kieBody?.code });

    if (!kieRes.ok || (kieBody?.code !== 200 && kieBody?.code !== 0)) {
      // Revertir estado si KIE rechazó
      await supabaseAdmin
        .from("ai_generations")
        .update({ mp4_status: "failed" })
        .eq("id", generation_id);

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

    // Guardar taskId de KIE si lo devuelve
    const mp4TaskId = kieBody?.data?.taskId || kieBody?.data?.task_id || null;
    if (mp4TaskId) {
      await supabaseAdmin
        .from("ai_generation_logs")
        .update({ provider_task_id: mp4TaskId, response_payload: kieBody })
        .eq("id", logId);
    }

    // Guardar generation_id en el log para que el callback pueda actualizar ai_generations
    await supabaseAdmin
      .from("ai_generation_logs")
      .update({
        request_payload: {
          generation_id,
          taskId: gen.provider_task_id,
          audioId,
          variantIndex,
        },
      })
      .eq("id", logId);

    console.log("[kie-mp4-generate] queued OK", { logId, mp4TaskId });

    return json({
      ok: true,
      logId,
      status: "processing",
      message: "Generando vídeo MP4. Estará listo en 1-2 minutos.",
    });

  } catch (err) {
    console.error("[kie-mp4-generate] fatal", err);
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
