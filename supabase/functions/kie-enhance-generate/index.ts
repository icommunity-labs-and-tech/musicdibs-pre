// supabase/functions/kie-enhance-generate/index.ts
// KIE Suno enhance — 3 modes: instrumental, cover, extend.
// FIX: customMode: false — KIE generates continuation autonomously, no lyrics needed.
// Eliminates ElevenLabs STT dependency and error 531.
// Callback routed through kie-suno-callback (already handles enhance feature_keys).
// v12 — language preservation for vocal modes (cover/extend)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-idempotency-key",
};

type EnhanceMode = "instrumental" | "cover" | "extend";

const MODEL = "V5";

const MODE_FEATURE_KEY: Record<EnhanceMode, string> = {
  instrumental: "enhance_instrumental",
  cover:        "enhance_cover",
  extend:       "enhance_extend",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const KIE_API_KEY = Deno.env.get("KIE_API_KEY");
    if (!KIE_API_KEY) return json({ error: "KIE_API_KEY not configured" }, 500);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json().catch(() => ({}));
    const {
      mode,
      source_audio_url,
      source_filename,
      source_duration_sec,
      prompt,
      genre,
      mood,
      intensity,
      voice_type,
    } = body || {};

    if (!mode || !["instrumental", "cover", "extend"].includes(mode)) {
      return json({ error: "invalid_mode", message: "mode must be instrumental|cover|extend" }, 400);
    }
    if (!source_audio_url || typeof source_audio_url !== "string") {
      return json({ error: "source_audio_url_required" }, 400);
    }

    const enhanceMode = mode as EnhanceMode;
    const featureKey = MODE_FEATURE_KEY[enhanceMode];
    const instrumentalFlag = enhanceMode === "instrumental" || voice_type === "none";

    // Build style prompt.
    // For cover/extend modes: append a language-preservation instruction so KIE/Suno
    // generates lyrics in the same language as the source audio (e.g. Spanish stays Spanish).
    // customMode: false lets KIE analyse the source audio and generate autonomously,
    // but without an explicit language hint it may default to English.
    const descParts: string[] = [];
    if (prompt && typeof prompt === "string") descParts.push(prompt.trim());
    if (genre)     descParts.push(`Genre: ${genre}`);
    if (mood)      descParts.push(`Mood: ${mood}`);
    if (intensity) descParts.push(`Intensity: ${intensity}`);

    // Language preservation: only for vocal modes (cover / extend)
    const needsLangHint = enhanceMode === "cover" || enhanceMode === "extend";
    if (needsLangHint && !instrumentalFlag) {
      descParts.push(
        "IMPORTANT: detect the vocal language of the source audio and generate ALL lyrics " +
        "in that exact same language — do NOT translate or switch to another language."
      );
    }

    const finalPrompt = (descParts.join(". ") || defaultPromptForMode(enhanceMode)).slice(0, 600);

    // Idempotency
    const idempotencyKey: string =
      req.headers.get("x-idempotency-key") ||
      (typeof body?.idempotencyKey === "string" && body.idempotencyKey) ||
      crypto.randomUUID();

    {
      const { data: existing } = await supabaseAdmin
        .from("ai_generation_logs")
        .select("id, status, provider_task_id, output_url")
        .eq("user_id", user.id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (existing) {
        return json({
          ok: true,
          deduplicated: true,
          logId: existing.id,
          taskId: existing.provider_task_id,
          status: existing.status,
          output_url: existing.output_url,
        });
      }
    }

    // Resolve credit cost from operation_pricing, fallback to feature_costs
    const { data: pricingRow } = await supabaseAdmin
      .from("operation_pricing")
      .select("credits_cost")
      .eq("operation_key", featureKey)
      .eq("is_active", true)
      .maybeSingle();
    let creditsCost = pricingRow?.credits_cost ?? null;
    if (creditsCost == null) {
      const { data: fc } = await supabaseAdmin
        .from("feature_costs")
        .select("credit_cost")
        .eq("feature_key", featureKey)
        .maybeSingle();
      creditsCost = fc?.credit_cost ?? 1;
    }

    // Atomic credit debit
    const { error: debitErr } = await supabaseAdmin.rpc("debit_user_credits", {
      p_user_id: user.id,
      p_amount: creditsCost,
      p_description: `AI Enhance (${enhanceMode}): ${(prompt || source_filename || "").slice(0, 80)}`,
    });
    if (debitErr) {
      const msg = String(debitErr.message || "");
      if (msg.includes("insufficient_credits")) {
        return json({ error: "insufficient_credits", required: creditsCost }, 402);
      }
      return json({ error: "debit_failed", message: msg }, 500);
    }

    const callbackToken = crypto.randomUUID().replace(/-/g, "") +
      crypto.randomUUID().replace(/-/g, "");

    const { data: logInsert, error: logErr } = await supabaseAdmin
      .from("ai_generation_logs")
      .insert({
        user_id: user.id,
        feature_key: featureKey,
        provider: "kie_suno",
        model: MODEL,
        status: "pending",
        request_payload: {
          mode: enhanceMode,
          source_audio_url,
          source_filename,
          source_duration_sec,
          prompt: finalPrompt,
          genre, mood, intensity, voice_type,
        },
        user_credits_charged: creditsCost,
        callback_token: callbackToken,
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();

    if (logErr || !logInsert) {
      await refund(supabaseAdmin, user.id, creditsCost, "Log row creation failed");
      return json({ error: "log_failed", message: logErr?.message }, 500);
    }
    const logId = logInsert.id;

    // Route callback through existing kie-suno-callback
    const callBackUrl =
      `${SUPABASE_URL}/functions/v1/kie-suno-callback?logId=${logId}&token=${callbackToken}`;

    // KIE endpoints: upload-extend for extend, upload-cover for cover+instrumental
    const endpoint = enhanceMode === "extend"
      ? "https://api.kie.ai/api/v1/generate/upload-extend"
      : "https://api.kie.ai/api/v1/generate/upload-cover";

    // customMode: false → KIE generates autonomously without requiring user lyrics.
    // This is the native fix for error 531. No ElevenLabs STT needed.
    // KIE upload-cover/upload-extend: when defaultParamFlag=true, model/style/title are
    // required at root. We pass defaultParamFlag=false to let KIE infer defaults from the
    // source audio while still honoring our model and prompt.
    const kiePayload: Record<string, unknown> = {
      uploadUrl:        source_audio_url,
      defaultParamFlag: false,
      prompt:           finalPrompt,
      style:            genre || "pop",
      title:            (source_filename || "Enhanced Track").slice(0, 80),
      customMode:       false,
      instrumental:     instrumentalFlag,
      model:            MODEL,
      callBackUrl,
    };

    if (enhanceMode === "extend" && typeof source_duration_sec === "number") {
      kiePayload.continueAt = Math.max(0, Math.floor(source_duration_sec) - 1);
    }
    if (voice_type === "m" || voice_type === "f") {
      kiePayload.vocalGender = voice_type;
    }

    console.log("[kie-enhance-generate] dispatching", { mode: enhanceMode, logId, endpoint, model: MODEL });

    const kieRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${KIE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(kiePayload),
    });
    const kieJson = await kieRes.json().catch(() => ({}));

    if (!kieRes.ok || (kieJson?.code && kieJson.code !== 200)) {
      console.error("[kie-enhance-generate] KIE error", kieRes.status, kieJson);
      await refund(supabaseAdmin, user.id, creditsCost, "KIE dispatch failed");
      await supabaseAdmin
        .from("ai_generation_logs")
        .update({
          status: "failed",
          error_message: kieJson?.msg || `HTTP ${kieRes.status}`,
          response_payload: kieJson,
        })
        .eq("id", logId);
      return json({ error: "provider_error", message: kieJson?.msg || "KIE request failed" }, 502);
    }

    const taskId: string | undefined = kieJson?.data?.taskId;
    await supabaseAdmin
      .from("ai_generation_logs")
      .update({
        provider_task_id: taskId ?? null,
        status: "processing",
        response_payload: kieJson,
      })
      .eq("id", logId);

    return json({
      ok: true,
      logId,
      taskId,
      status: "processing",
      message: "Enhance started. Audio will be available shortly.",
    });
  } catch (err) {
    console.error("[kie-enhance-generate] fatal", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function defaultPromptForMode(mode: EnhanceMode): string {
  if (mode === "cover") return "Keep the original essence, enhance production quality";
  if (mode === "extend") return "Continue naturally maintaining style and tempo";
  return "Add professional production and instrumentation";
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function refund(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  amount: number,
  reason: string,
) {
  const { data: p } = await supabase
    .from("profiles")
    .select("available_credits")
    .eq("user_id", userId)
    .single();
  if (!p) return;
  await supabase
    .from("profiles")
    .update({
      available_credits: p.available_credits + amount,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  await supabase.from("credit_transactions").insert({
    user_id: userId,
    amount,
    type: "refund",
    description: `Reembolso: ${reason}`.slice(0, 200),
  });
}
