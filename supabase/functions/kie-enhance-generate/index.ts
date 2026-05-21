// supabase/functions/kie-enhance-generate/index.ts
// KIE Suno enhance — 3 modes: instrumental, cover, extend.
// FIX: customMode: false — KIE generates continuation autonomously, no lyrics needed.
// Eliminates ElevenLabs STT dependency and error 531.
// Callback routed through kie-suno-callback (already handles enhance feature_keys).
// v14 — uploadUrl (not audioUrl), model V5, defaultParamFlag: false, source_language
// Deploy: supabase functions deploy kie-enhance-generate
//
// Patrón idéntico a kie-suno-generate:
//  - Auth via JWT
//  - Atomic credit debit via debit_user_credits RPC
//  - Row en ai_generation_logs con feature_key propio
//  - callback_token para autenticar webhook de KIE
//  - KIE recibe callBackUrl → llama kie-enhance-callback al terminar

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-idempotency-key",
};

// ── Modos y feature keys ───────────────────────────────────────────────────────
const FEATURE_KEYS: Record<string, string> = {
  cover:        "enhance_cover",        // Upload And Cover Audio
  extend:       "enhance_extend",       // Extend Music
  instrumental: "enhance_instrumental", // Add Instrumental
};

// ── Costes por defecto (fallback si operation_pricing no tiene la fila) ────────
const DEFAULT_CREDITS: Record<string, number> = {
  cover:        4,
  extend:       3,
  instrumental: 3,
};

// ── KIE endpoints por modo ─────────────────────────────────────────────────────
// Ajustar según documentación actual de KIE AI
const KIE_ENDPOINTS: Record<string, string> = {
  cover:        "https://api.kie.ai/api/v1/generate/upload-cover",
  extend:       "https://api.kie.ai/api/v1/generate/extend",
  instrumental: "https://api.kie.ai/api/v1/generate/upload-instrumental",
};

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
    const {
      mode,
      source_audio_url,
      prompt,
      source_filename,
      source_duration_sec,
      genre,
      mood,
      intensity,
      voice_type,
      musical_style,
      source_language,
    } = body || {};

    if (!mode || !FEATURE_KEYS[mode]) {
      return json({ error: "Invalid mode. Use: cover | extend | instrumental" }, 400);
    }
    if (!source_audio_url || typeof source_audio_url !== "string") {
      return json({ error: "source_audio_url is required" }, 400);
    }

    const featureKey = FEATURE_KEYS[mode];

    // ── Idempotency ────────────────────────────────────────────────────────────
    const idempotencyKey: string =
      req.headers.get("x-idempotency-key") ||
      body?.idempotencyKey ||
      crypto.randomUUID();

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

    // ── Resolver coste de créditos desde operation_pricing ────────────────────
    const { data: pricingRow } = await supabaseAdmin
      .from("operation_pricing")
      .select("credits_cost")
      .eq("operation_key", featureKey)
      .eq("is_active", true)
      .maybeSingle();
    const creditsCost = pricingRow?.credits_cost ?? DEFAULT_CREDITS[mode];

    // ── Débito atómico de créditos ─────────────────────────────────────────────
    const styleLabel = [genre, mood, musical_style, prompt].filter(Boolean).join(", ").slice(0, 80);
    const { error: debitErr } = await supabaseAdmin.rpc("debit_user_credits", {
      p_user_id: user.id,
      p_amount: creditsCost,
      p_description: `Enhance audio (${mode}): ${styleLabel || source_filename || "demo"}`,
    });

    if (debitErr) {
      const msg = String(debitErr.message || "");
      if (msg.includes("insufficient_credits")) {
        return json({ error: "insufficient_credits", required: creditsCost }, 402);
      }
      return json({ error: "debit_failed", message: msg }, 500);
    }

    // ── Crear log row con callback_token ───────────────────────────────────────
    const callbackToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const callBackUrl = `${SUPABASE_URL}/functions/v1/kie-enhance-callback?token=${callbackToken}`;

    const { data: logInsert, error: logErr } = await supabaseAdmin
      .from("ai_generation_logs")
      .insert({
        user_id: user.id,
        feature_key: featureKey,
        provider: "kie_suno",
        model: "enhance",
        status: "pending",
        request_payload: {
          mode,
          source_audio_url,
          source_filename,
          source_duration_sec,
          prompt,
          genre,
          mood,
          intensity,
          voice_type,
          musical_style,
          source_language,
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

    // ── Construir payload KIE según modo ──────────────────────────────────────
    // Map locale codes → English language names that KIE/Suno understands
    const LANG_MAP: Record<string, string> = {
      es: "Spanish", en: "English", fr: "French", pt: "Portuguese",
      de: "German", it: "Italian", ja: "Japanese", ko: "Korean", zh: "Chinese",
    };

    // Language instruction: explicit beats "detect" because KIE uses prompt language
    // when customMode=false. We write the instruction in English so KIE parses it
    // correctly regardless of what language the rest of the prompt is in.
    const needsVoice = mode === "cover" || mode === "extend";
    const langParts: string[] = [];
    if (needsVoice) {
      const langCode = typeof source_language === "string" ? source_language.toLowerCase() : "auto";
      const langName = LANG_MAP[langCode];
      if (langName) {
        langParts.push(
          `CRITICAL: The source audio vocals are in ${langName}. ` +
          `Generate ALL lyrics in ${langName} ONLY — do NOT switch languages.`
        );
      } else {
        // auto-detect fallback: still write in English so KIE respects it
        langParts.push(
          "IMPORTANT: Detect the vocal language of the source audio and generate " +
          "ALL lyrics in that exact same language — do NOT translate or change language."
        );
      }
    }

    const styleParts = [genre, mood, musical_style, prompt].filter(Boolean).join(", ") ||
      defaultPromptForMode(mode);

    const allParts = [...langParts, styleParts];
    const finalPrompt = allParts.join(" ").slice(0, 600);

    // KIE upload-cover / upload-extend required fields per docs:
    // uploadUrl, prompt, customMode, instrumental, model.
    // With customMode=false: only prompt + uploadUrl are content-required; style/title
    // should be empty. `defaultParamFlag` does NOT exist on this endpoint.
    const MODEL = "V5";
    const instrumentalFlag = mode === "instrumental" || voice_type === "none";
    const kiePayload: Record<string, unknown> = {
      uploadUrl: source_audio_url,
      prompt: finalPrompt,
      customMode: false,
      instrumental: instrumentalFlag,
      model: MODEL,
      callBackUrl,
    };

    if (mode === "cover" && (voice_type === "m" || voice_type === "f")) {
      kiePayload.vocalGender = voice_type;
    }
    if (mode === "extend" && source_duration_sec) {
      kiePayload.continueAt = Math.floor(source_duration_sec * 0.85);
    }

    console.log(`[kie-enhance-generate] mode=${mode} logId=${logId} credits=${creditsCost} model=${MODEL}`);

    // ── Llamar a KIE ──────────────────────────────────────────────────────────
    const kieEndpoint = KIE_ENDPOINTS[mode];
    const kieRes = await fetch(kieEndpoint, {
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

    const taskId: string | undefined = kieJson?.data?.taskId || kieJson?.data?.task_id;
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
      credits_used: creditsCost,
      mode,
    });

  } catch (err) {
    console.error("[kie-enhance-generate] fatal", err);
    return json({ error: (err as Error).message }, 500);
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────────
function defaultPromptForMode(mode: string): string {
  if (mode === "cover") return "Keep the original essence, enhance production quality";
  if (mode === "extend") return "Continue naturally maintaining style and tempo";
  return "Add professional production and instrumentation";
}

function json(payload: unknown, status = 200, noBody = false): Response {
  if (noBody) return new Response(null, { status, headers: corsHeaders });
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
  try {
    const { data: p } = await supabase
      .from("profiles")
      .select("available_credits")
      .eq("user_id", userId)
      .single();
    if (!p) return;
    await supabase
      .from("profiles")
      .update({ available_credits: p.available_credits