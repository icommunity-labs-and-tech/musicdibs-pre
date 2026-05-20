// KIE Suno enhance — 3 modes: instrumental (add instrumentation), cover (new version), extend.
// Uses KIE upload-cover and upload-extend endpoints with async callback to kie-suno-callback.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-idempotency-key",
};

type EnhanceMode = "instrumental" | "cover" | "extend";

const MODE_FEATURE_KEY: Record<EnhanceMode, string> = {
  instrumental: "enhance_instrumental",
  cover: "enhance_cover",
  extend: "enhance_extend",
};

const MODE_OP_KEY: Record<EnhanceMode, string> = {
  instrumental: "enhance_instrumental",
  cover: "enhance_cover",
  extend: "enhance_extend",
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
    const willHaveVocals = !instrumentalFlag;

    // For cover/extend modes with vocals, try to transcribe the source audio with
    // ElevenLabs scribe_v1 so we can pass real lyrics to KIE (extend especially
    // fails with code 531 when no lyrics are provided).
    let transcribedLyrics = "";
    let detectedLanguage = "";
    if (willHaveVocals) {
      try {
        const ELEVEN_KEY = Deno.env.get("ELEVENLABS_API_KEY");
        if (ELEVEN_KEY) {
          const audioRes = await fetch(source_audio_url);
          if (audioRes.ok) {
            const blob = await audioRes.blob();
            const form = new FormData();
            form.append("file", blob, source_filename || "audio.mp3");
            form.append("model_id", "scribe_v1");
            const sttRes = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
              method: "POST",
              headers: { "xi-api-key": ELEVEN_KEY },
              body: form,
            });
            if (sttRes.ok) {
              const sttJson = await sttRes.json();
              transcribedLyrics = String(sttJson?.text || "").trim();
              detectedLanguage = String(sttJson?.language_code || sttJson?.language || "").trim();
              console.log("[kie-enhance-generate] STT ok", {
                chars: transcribedLyrics.length,
                lang: detectedLanguage,
              });
            } else {
              console.warn("[kie-enhance-generate] STT failed", sttRes.status, await sttRes.text());
            }
          }
        }
      } catch (e) {
        console.warn("[kie-enhance-generate] STT exception", (e as Error).message);
      }
    }

    // Build description block (style/mood/intensity + user description)
    const descParts: string[] = [];
    if (prompt && typeof prompt === "string") descParts.push(prompt.trim());
    if (genre) descParts.push(`Genre: ${genre}`);
    if (mood) descParts.push(`Mood: ${mood}`);
    if (intensity) descParts.push(`Intensity: ${intensity}`);
    const description = descParts.join(". ");

    // KIE prompt:
    // - extend: must contain lyrics structure to avoid code 531
    // - cover: lyrics greatly improve fidelity to source vocal language
    // - instrumental: free-form description
    let finalPrompt = "";
    const langNote = detectedLanguage
      ? ` Keep ALL lyrics in ${detectedLanguage} — do NOT translate.`
      : willHaveVocals
        ? " Detect the vocal language of the source audio and keep ALL lyrics in that exact same language — do NOT translate."
        : "";

    if (enhanceMode === "extend") {
      if (transcribedLyrics) {
        // Provide the original lyrics inside a [Verse] block so KIE can continue them.
        finalPrompt =
          `[Verse]\n${transcribedLyrics}\n\n[Continue the song coherently from here in the same vocal language and style.]${langNote}`;
      } else if (instrumentalFlag) {
        finalPrompt = description || "Continue and extend the instrumental coherently in the same style.";
      } else {
        // No lyrics could be transcribed — fall back to a minimal lyric scaffold to avoid 531.
        finalPrompt =
          `[Verse]\nLa la la, continue the melody\n\n[Chorus]\nLa la la, follow the original mood\n\n` +
          `Continue and extend the song coherently.${langNote} ${description}`.trim();
      }
    } else if (enhanceMode === "cover") {
      if (transcribedLyrics) {
        finalPrompt =
          `[Lyrics]\n${transcribedLyrics}\n\nReinterpret as: ${description || "modern polished version"}.${langNote}`;
      } else {
        finalPrompt = `${description || "Reinterpret as a modern polished version of the source audio"}.${langNote}`;
      }
    } else {
      // instrumental
      finalPrompt = description || "Add full instrumentation, professional production";
    }
    finalPrompt = finalPrompt.slice(0, 2900);

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

    // Resolve credit cost
    const operationKey = MODE_OP_KEY[enhanceMode];
    const { data: pricingRow } = await supabaseAdmin
      .from("operation_pricing")
      .select("credits_cost")
      .eq("operation_key", operationKey)
      .eq("is_active", true)
      .maybeSingle();
    // Fallback to feature_costs, then 1
    let creditsCost = pricingRow?.credits_cost ?? null;
    if (creditsCost == null) {
      const { data: fc } = await supabaseAdmin
        .from("feature_costs")
        .select("credit_cost")
        .eq("feature_key", featureKey)
        .maybeSingle();
      creditsCost = fc?.credit_cost ?? 1;
    }

    // Atomic debit
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
        model: "V4_5",
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

    const callBackUrl =
      `${SUPABASE_URL}/functions/v1/kie-suno-callback?logId=${logId}&token=${callbackToken}`;

    // instrumentalFlag computed above

    // Pick endpoint
    const endpoint = enhanceMode === "extend"
      ? "https://api.kie.ai/api/v1/generate/upload-extend"
      : "https://api.kie.ai/api/v1/generate/upload-cover";

    const kiePayload: Record<string, unknown> = {
      uploadUrl: source_audio_url,
      defaultParamFlag: true,
      prompt: finalPrompt,
      style: genre || "pop",
      title: (source_filename || "Enhanced Track").slice(0, 80),
      customMode: true,
      instrumental: instrumentalFlag,
      model: "V4_5",
      callBackUrl,
    };

    if (enhanceMode === "extend" && typeof source_duration_sec === "number") {
      // KIE upload-extend uses continueAt to mark where to continue from
      kiePayload.continueAt = Math.max(0, Math.floor(source_duration_sec) - 1);
    }
    if (voice_type === "m" || voice_type === "f") {
      kiePayload.vocalGender = voice_type;
    }

    console.log("[kie-enhance-generate] dispatching", { mode: enhanceMode, logId, endpoint });

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
