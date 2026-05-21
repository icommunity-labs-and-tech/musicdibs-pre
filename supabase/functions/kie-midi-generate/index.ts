// supabase/functions/kie-midi-generate/index.ts
// Genera un archivo MIDI a partir de un audio ya generado por KIE en MusicDibs.
//
// Pipeline de 2 pasos gestionado por callbacks:
//   1. Stem separation: POST /api/v1/vocal-removal/generate (type: separate_vocal)
//      → KIE llama kie-midi-callback?stage=separation&token=TOKEN al terminar
//   2. MIDI export: kie-midi-callback llama POST /api/v1/midi/generate con el taskId de separation
//      → KIE llama kie-midi-callback?stage=midi&token=TOKEN al terminar
//
// Restricción importante: solo funciona con audios que tengan provider_task_id
// (es decir, tracks generados por KIE/Suno dentro de MusicDibs).
//
// Deploy: supabase functions deploy kie-midi-generate

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-idempotency-key",
};

const DEFAULT_CREDITS = 2;
const FEATURE_KEY = "midi_generate";

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
    const { source_log_id } = body || {};

    if (!source_log_id) {
      return json({ error: "source_log_id is required" }, 400);
    }

    // ── Idempotency ────────────────────────────────────────────────────────────
    const idempotencyKey: string =
      req.headers.get("x-idempotency-key") ||
      body?.idempotencyKey ||
      `midi_${source_log_id}`;

    const { data: existing } = await supabaseAdmin
      .from("ai_generation_logs")
      .select("id, status, output_url")
      .eq("user_id", user.id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing) {
      return json({
        ok: true,
        deduplicated: true,
        logId: existing.id,
        status: existing.status,
        output_url: existing.output_url,
      });
    }

    // ── Buscar el log de origen y su provider_task_id ─────────────────────────
    const { data: sourceLog, error: sourceErr } = await supabaseAdmin
      .from("ai_generation_logs")
      .select("id, user_id, provider_task_id, feature_key, status, output_url, response_payload, structured_outputs")
      .eq("id", source_log_id)
      .maybeSingle();

    if (sourceErr || !sourceLog) {
      return json({ error: "source_log_id not found" }, 404);
    }

    // Verificar que el log pertenece al usuario
    if (sourceLog.user_id !== user.id) {
      return json({ error: "Forbidden" }, 403);
    }

    // Verificar que tiene provider_task_id (generado por KIE)
    if (!sourceLog.provider_task_id) {
      return json({
        error: "midi_not_available",
        message: "La exportación MIDI solo está disponible para tracks generados con KIE/Suno en MusicDibs.",
      }, 422);
    }

    // Verificar que el track está completado
    if (sourceLog.status !== "completed") {
      return json({
        error: "source_not_ready",
        message: "El audio de origen no ha terminado de procesarse.",
      }, 422);
    }

    // ── Resolver audioId desde response_payload o vía KIE record-info ─────────
    // KIE vocal-removal requiere taskId + audioId (id de la variante concreta).
    const tracksFromPayload: any[] = Array.isArray(sourceLog.response_payload?.data?.data)
      ? sourceLog.response_payload.data.data
      : [];
    let audioId: string | null =
      tracksFromPayload[0]?.id ||
      tracksFromPayload[0]?.audio_id ||
      sourceLog.structured_outputs?.variants?.[0]?.audio_id ||
      null;

    if (!audioId) {
      // Fallback: consultar KIE record-info para obtener los audioIds de la task
      try {
        const infoRes = await fetch(
          `https://api.kie.ai/api/v1/generate/record-info?taskId=${encodeURIComponent(sourceLog.provider_task_id)}`,
          { headers: { Authorization: `Bearer ${KIE_API_KEY}` } }
        );
        const infoBody = await infoRes.json().catch(() => ({}));
        const items: any[] =
          infoBody?.data?.response?.sunoData ||
          infoBody?.data?.data ||
          [];
        audioId = items[0]?.id || items[0]?.audioId || null;
        console.log("[kie-midi-generate] record-info lookup", {
          taskId: sourceLog.provider_task_id,
          found: !!audioId,
        });
      } catch (e) {
        console.error("[kie-midi-generate] record-info failed", e);
      }
    }

    if (!audioId) {
      return json({
        error: "audio_id_missing",
        message: "No se pudo resolver el audioId del track original en KIE.",
      }, 422);
    }

    // ── Resolver coste de créditos desde operation_pricing ────────────────────
    const { data: pricingRow } = await supabaseAdmin
      .from("operation_pricing")
      .select("credits_cost")
      .eq("operation_key", FEATURE_KEY)
      .eq("is_active", true)
      .maybeSingle();
    const creditsCost = pricingRow?.credits_cost ?? DEFAULT_CREDITS;

    // ── Débito atómico de créditos ─────────────────────────────────────────────
    const { error: debitErr } = await supabaseAdmin.rpc("debit_user_credits", {
      p_user_id: user.id,
      p_amount: creditsCost,
      p_description: `Exportar MIDI (track: ${source_log_id.slice(0, 8)}…)`,
    });

    if (debitErr) {
      const msg = String(debitErr.message || "");
      if (msg.includes("insufficient_credits")) {
        return json({ error: "insufficient_credits", required: creditsCost }, 402);
      }
      return json({ error: "debit_failed", message: msg }, 500);
    }

    // ── Crear log row con callback_token ───────────────────────────────────────
    const callbackToken =
      crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const callBackUrl = `${SUPABASE_URL}/functions/v1/kie-midi-callback?stage=separation&token=${callbackToken}`;

    const { data: logInsert, error: logErr } = await supabaseAdmin
      .from("ai_generation_logs")
      .insert({
        user_id: user.id,
        feature_key: FEATURE_KEY,
        provider: "kie_suno",
        model: "midi_pipeline",
        status: "pending_separation",
        idempotency_key: idempotencyKey,
        callback_token: callbackToken,
        user_credits_charged: creditsCost,
        request_payload: {
          source_log_id,
          source_task_id: sourceLog.provider_task_id,
        },
      })
      .select("id")
      .single();

    if (logErr || !logInsert) {
      // Reembolso si falla la inserción del log
      await supabaseAdmin.rpc("debit_user_credits", {
        p_user_id: user.id,
        p_amount: -creditsCost,
        p_description: "Reembolso: error interno al iniciar MIDI",
      }).catch(() => {});
      return json({ error: "log_insert_failed", message: logErr?.message }, 500);
    }

    const logId = logInsert.id;

    // ── Llamar a KIE: stem separation ─────────────────────────────────────────
    // La separación necesita el taskId de KIE (provider_task_id del audio original)
    const kiePayload = {
      taskId: sourceLog.provider_task_id,
      audioId,
      type: "separate_vocal", // 2 stems (vocal + instrumental), 10 KIE credits
      callBackUrl,
    };

    console.log("[kie-midi-generate] calling KIE vocal-removal", {
      logId,
      kieTaskId: sourceLog.provider_task_id,
    });

    const kieRes = await fetch("https://api.kie.ai/api/v1/vocal-removal/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KIE_API_KEY}`,
      },
      body: JSON.stringify(kiePayload),
    });

    const kieBody = await kieRes.json().catch(() => ({ code: -1, msg: "parse error" }));
    console.log("[kie-midi-generate] KIE response", { status: kieRes.status, code: kieBody?.code });

    if (!kieRes.ok || (kieBody?.code !== 200 && kieBody?.code !== 0)) {
      // Reembolso: KIE rechazó la petición
      const charged = creditsCost;
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("available_credits")
        .eq("user_id", user.id)
        .single();
      if (profile) {
        await supabaseAdmin
          .from("profiles")
          .update({
            available_credits: (profile.available_credits as number) + charged,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
        await supabaseAdmin.from("credit_transactions").insert({
          user_id: user.id,
          amount: charged,
          type: "refund",
          description: "Reembolso: KIE rechazó separación de stems para MIDI",
        });
      }
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

    // KIE acepta la petición — actualizamos con el taskId de separación si viene en la respuesta
    const separationTaskId = kieBody?.data?.task_id || kieBody?.data?.taskId || null;
    if (separationTaskId) {
      await supabaseAdmin
        .from("ai_generation_logs")
        .update({ provider_task_id: separationTaskId })
        .eq("id", logId);
    }

    console.log("[kie-midi-generate] separation queued", { logId, separationTaskId });

    return json({
      ok: true,
      logId,
      status: "pending_separation",
      message: "Separación de stems iniciada. El MIDI estará listo en aproximadamente 1-2 minutos.",
    });

  } catch (err) {
    console.error("[kie-midi-generate] fatal", err);
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
