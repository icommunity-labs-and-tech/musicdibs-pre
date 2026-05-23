// supabase/functions/kie-enhance-generate/index.ts
// KIE Suno enhance — 4 modes: instrumental, cover, extend, add_vocals.
// FIX: customMode: false — KIE generates continuation autonomously, no lyrics needed.
// Eliminates ElevenLabs STT dependency and error 531.
// Callback routed through kie-suno-callback (already handles enhance feature_keys).
// v15 — uploadUrl (not audioUrl), model V5, defaultParamFlag: false, source_language,
//        instrumental: boolean (required by KIE for all upload-* endpoints, fixes code 422)
// v16 — tags field: KIE customMode:false requires "tags" (style descriptor) in addition to
//        prompt. Missing tags causes 502 "Please enter tags." on upload-instrumental.
//        tags = styleParts (genre+mood+style), prompt = langInstruction + styleParts.
// v17 — negativeTags: " " (required non-empty by KIE, space = no exclusions). Duplicate key cleanup.
// v18 — Correct endpoints: extend→upload-extend, instrumental→add-instrumental (was upload-instrumental).
//        add-instrumental has its own schema: requires title, tags, negativeTags.
//        Does NOT accept prompt/customMode/defaultParamFlag/instrumental fields.
//        upload-cover/upload-extend: defaultParamFlag:false → only uploadUrl+prompt required.
// v20 — extend mode fixes: defaultParamFlag:true, style (not tags), continueAt <duration, quality params, drop customMode.
// v21 — cover mode fixes: customMode:true (not defaultParamFlag), map voice_type→vocalGender, add quality params for cover.
// v22 — all modes: intensity ("low"/"medium"/"high") now included in styleParts/tags (was silently dropped).
//        Model upgraded to V5_5 for instrumental (latest, better than V5 for this endpoint).
//        Frontend preset "fidelidad" maps to audioWeight/styleWeight/weirdnessConstraint combos.
// v23 — add_vocals mode: /api/v1/generate/add-vocals — adds vocal singing to an instrumental.
//        Required: uploadUrl, prompt, title, negativeTags, style, callBackUrl.
//        Optional: model, vocalGender, styleWeight, weirdnessConstraint, audioWeight.
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
  add_vocals:   "enhance_add_vocals",   // Add Vocals to instrumental
};

// ── Costes por defecto (fallback si operation_pricing no tiene la fila) ────────
const DEFAULT_CREDITS: Record<string, number> = {
  cover:        4,
  extend:       3,
  instrumental: 3,
  add_vocals:   4,
};

// ── KIE endpoints por modo ─────────────────────────────────────────────────────
// Ajustar según documentación actual de KIE AI
const KIE_ENDPOINTS: Record<string, string> = {
  cover:        "https://api.kie.ai/api/v1/generate/upload-cover",
  extend:       "https://api.kie.ai/api/v1/generate/upload-extend",   // upload-extend (external audio), not /extend (taskId-based)
  instrumental: "https://api.kie.ai/api/v1/generate/add-instrumental", // add-instrumental, not /upload-instrumental
  add_vocals:   "https://api.kie.ai/api/v1/generate/add-vocals",       // Add Vocals to Music
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
      // add-instrumental quality params (v19)
      vocal_gender,       // "m" | "f" — vocal register for backing track generation
      style_weight,       // 0-1 — adherence to style tags
      audio_weight,       // 0-1 — how much to follow the uploaded audio's characteristics
      weirdness_constraint, // 0-1 — 0=conventional, 1=experimental
      continue_at,        // number — custom continueAt override (seconds), for extend mode
    } = body || {};

    if (!mode || !FEATURE_KEYS[mode]) {
      return json({ error: "Invalid mode. Use: cover | extend | instrumental | add_vocals" }, 400);
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
          vocal_gender,
          style_weight,
          audio_weight,
          weirdness_constraint,
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

    // Map intensity values to descriptive tags Suno understands
    const INTENSITY_MAP: Record<string, string> = {
      low: "low energy, soft, gentle",
      medium: "medium energy",
      high: "high energy, intense, powerful",
    };
    const intensityTag = typeof intensity === "string" && INTENSITY_MAP[intensity]
      ? INTENSITY_MAP[intensity] : null;

    const styleParts = [genre, mood, intensityTag, musical_style, prompt].filter(Boolean).join(", ") ||
      defaultPromptForMode(mode);

    const allParts = [...langParts, styleParts];
    // KIE non-custom mode: prompt max 500 chars (hard limit, returns 422 otherwise)
    const finalPrompt = allParts.join(" ").slice(0, 500);

    // ── Payload KIE — mode-specific ───────────────────────────────────────────
    // add-instrumental (/add-instrumental) has its own schema:
    //   required: uploadUrl, title, tags, negativeTags, callBackUrl
    //   does NOT accept: prompt, customMode, defaultParamFlag, instrumental
    // upload-cover / upload-extend (/upload-cover, /upload-extend):
    //   defaultParamFlag:true → sends style, title, prompt, continueAt properly
    // V5_5 for instrumental (newer, better vocal accompaniment generation)
    // V5 for cover/extend (consistent with source music model version requirement)
    const MODEL_INSTRUMENTAL = "V5_5";
    const MODEL_COVER_EXTEND = "V5";
    const title = source_filename
      ? source_filename.replace(/\.[^.]+$/, "").slice(0, 80)
      : styleParts.slice(0, 80) || "Enhanced audio";
    const negativeTags = "low quality, distorted, noisy";

    let kiePayload: Record<string, unknown>;

    if (mode === "instrumental") {
      // add-instrumental endpoint — clean schema, no prompt/customMode/defaultParamFlag
      // Quality params: vocalGender critical for register matching; weights control style adherence
      kiePayload = {
        uploadUrl: source_audio_url,
        title,
        tags: styleParts,
        negativeTags,
        model: MODEL_INSTRUMENTAL,
        callBackUrl,
      };
      // vocalGender: helps Suno match the backing to the vocal register
      if (vocal_gender === "m" || vocal_gender === "f") {
        kiePayload.vocalGender = vocal_gender;
      }
      // Weight params: only send if explicitly provided (KIE uses its own defaults otherwise)
      if (typeof style_weight === "number") kiePayload.styleWeight = style_weight;
      if (typeof audio_weight === "number") kiePayload.audioWeight = audio_weight;
      if (typeof weirdness_constraint === "number") kiePayload.weirdnessConstraint = weirdness_constraint;
    } else if (mode === "cover") {
      // upload-cover — Non-custom Mode (customMode:false) per KIE docs:
      //   "Only `prompt` and `uploadUrl` are required, regardless of the `instrumental` setting.
      //    `prompt` length limit: 500 characters. Other parameters should be left empty."
      // The user's description ("convierte esta cumbia en un rap") is a transformation intent,
      // NOT literal lyrics — so customMode:true would be wrong (it would sing the description).
      // In non-custom mode, lyrics are auto-generated from `prompt`. We fold the genre/mood/
      // intensity/style hints into the prompt itself so KIE has full context.
      // v24 — fix: previously sent customMode:true with style=prompt=description, causing the
      // description to be interpreted as both style and lyrics. Now correctly uses prompt-only.
      kiePayload = {
        uploadUrl: source_audio_url,
        prompt: finalPrompt,
        instrumental: false,
        customMode: false,
        model: MODEL_COVER_EXTEND,
        callBackUrl,
      };
      // Optional params still accepted in non-custom mode per docs
      const vg = voice_type === "female" ? "f" : voice_type === "male" ? "m" : null;
      if (vg) kiePayload.vocalGender = vg;
      if (typeof style_weight === "number") kiePayload.styleWeight = style_weight;
      if (typeof audio_weight === "number") kiePayload.audioWeight = audio_weight;
      if (typeof weirdness_constraint === "number") kiePayload.weirdnessConstraint = weirdness_constraint;
      kiePayload.negativeTags = negativeTags;
    } else if (mode === "extend") {
      // upload-extend — defaultParamFlag:true → custom params
      // style (not tags), continueAt strictly > 0 AND < duration.
      kiePayload = {
        uploadUrl: source_audio_url,
        title,
        style: styleParts,
        negativeTags,
        prompt: finalPrompt,
        instrumental: false,
        defaultParamFlag: true,
        model: MODEL_COVER_EXTEND,
        callBackUrl,
      };
      // extend: continueAt must be > 0 AND < duration.
      const dur = typeof source_duration_sec === "number" && source_duration_sec > 0
        ? source_duration_sec
        : 30;
      const customAt = typeof continue_at === "number" && continue_at > 0 && continue_at < dur
        ? Math.floor(continue_at)
        : Math.max(1, Math.floor(dur * 0.9));
      kiePayload.continueAt = customAt;
      // Quality params for extend
      if (vocal_gender === "m" || vocal_gender === "f") kiePayload.vocalGender = vocal_gender;
      if (typeof style_weight === "number") kiePayload.styleWeight = style_weight;
      if (typeof audio_weight === "number") kiePayload.audioWeight = audio_weight;
      if (typeof weirdness_constraint === "number") kiePayload.weirdnessConstraint = weirdness_constraint;
    } else {
      // add-vocals — /api/v1/generate/add-vocals
      // Required: uploadUrl, prompt, title, negativeTags, style, callBackUrl
      // No customMode / defaultParamFlag / instrumental fields for this endpoint.
      // vocalGender controls the singing voice gender directly.
      //
      // KIE docs: "prompt defines lyric content and singing style"
      //           "style and negativeTags are used to control music and vocal style"
      //
      // → style: genre presets + mood + intensity + vocal gender label (NO user text)
      // → prompt: ONLY the user's description (KIE uses this to generate lyrics/singing topic)
      const vocalGenderLabel = vocal_gender === "m" ? "male vocals" : vocal_gender === "f" ? "female vocals" : "";
      const stylePartsVocal = [genre, mood, intensityTag, vocalGenderLabel].filter(Boolean).join(", ") || "pop vocal";
      const promptVocal = (typeof prompt === "string" && prompt.trim())
        ? prompt.slice(0, 500)
        : "Add beautiful emotional vocals to this instrumental track";

      kiePayload = {
        uploadUrl: source_audio_url,
        title,
        prompt: promptVocal,
        style: stylePartsVocal,
        negativeTags,
        model: MODEL_COVER_EXTEND, // V5 — good vocal quality
        callBackUrl,
      };
      // vocalGender: direct control of the generated singing voice gender
      if (vocal_gender === "m" || vocal_gender === "f") kiePayload.vocalGender = vocal_gender;
      // Quality params
      if (typeof style_weight === "number") kiePayload.styleWeight = style_weight;
      if (typeof audio_weight === "number") kiePayload.audioWeight = audio_weight;
      if (typeof weirdness_constraint === "number") kiePayload.weirdnessConstraint = weirdness_constraint;
    }

    console.log(`[kie-enhance-generate] mode=${mode} logId=${logId} credits=${creditsCost} model=${kiePayload.model}`);

    const kieRes = await fetch(KIE_ENDPOINTS[mode], {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${KIE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(kiePayload),
    });

    const kieData = await kieRes.json().catch(() => ({}));

    if (!kieRes.ok || (kieData?.code && kieData.code !== 200)) {
      console.error(`[kie-enhance-generate] KIE error ${kieRes.status}`, kieData);
      await refund(supabaseAdmin, user.id, creditsCost, "KIE dispatch failed");
      await supabaseAdmin
        .from("ai_generation_logs")
        .update({
          status: "failed",
          error_message: kieData?.msg || `HTTP ${kieRes.status}`,
          response_payload: kieData,
        })
        .eq("id", logId);
      return json({ error: "provider_error", message: kieData?.msg || "KIE request failed" }, 502);
    }

    const taskId: string | undefined = kieData?.data?.taskId;
    await supabaseAdmin
      .from("ai_generation_logs")
      .update({
        provider_task_id: taskId ?? null,
        status: "processing",
        response_payload: kieData,
      })
      .eq("id", logId);

    return json({
      ok: true,
      logId,
      taskId,
      status: "processing",
      message: "Generation started. Audio will be available shortly.",
    });
  } catch (err) {
    console.error("[kie-enhance-generate] fatal", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200, isOptions = false): Response {
  if (isOptions) return new Response(null, { status, headers: corsHeaders });
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
function defaultPromptForMode(mode: string): string {
  switch (mode) {
    case "cover":        return "Create a fresh cover version with a new style while keeping the melody";
    case "extend":       return "Continue the song naturally in the same style";
    case "instrumental": return "Add a fitting instrumental backing";
    case "add_vocals":   return "Add beautiful emotional vocals";
    default:             return "Enhance this audio";
  }
}
