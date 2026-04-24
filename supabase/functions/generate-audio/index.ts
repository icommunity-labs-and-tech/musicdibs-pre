import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ── Composition plan helper ──────────────────────────────────
// Calls ElevenLabs /v1/music/composition-plan to get a structural plan
// from a style prompt, then injects user-provided lyrics into vocal sections
// word-for-word. Returns null on any failure (caller falls back to prompt-only).
async function buildCompositionPlan(
  stylePrompt: string,
  lyrics: string,
  durationMs: number,
  apiKey: string,
): Promise<any | null> {
  try {
    const planResp = await fetch('https://api.elevenlabs.io/v1/music/composition-plan', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: stylePrompt,
        music_length_ms: durationMs,
      }),
    });

    if (!planResp.ok) {
      console.warn(`[GENERATE-AUDIO] composition-plan failed: ${planResp.status} ${await planResp.text().catch(() => '')}`);
      return null;
    }

    const plan = await planResp.json();
    const sections = Array.isArray(plan?.sections) ? plan.sections : [];
    if (sections.length === 0) return null;

    // Identify vocal sections — exclude intro/outro/instrumental/break
    const isVocalSection = (s: any): boolean => {
      const name = String(s?.section_name || s?.name || '').toLowerCase();
      const type = String(s?.section_type || s?.type || '').toLowerCase();
      const blockedKeywords = ['intro', 'outro', 'instrumental', 'break', 'interlude', 'solo'];
      if (blockedKeywords.some(k => name.includes(k) || type.includes(k))) return false;
      return true;
    };

    const vocalIdxs: number[] = sections
      .map((s: any, i: number) => (isVocalSection(s) ? i : -1))
      .filter((i: number) => i >= 0);

    if (vocalIdxs.length === 0) return null;

    // Split user lyrics into non-empty lines, strip section markers like [Verso], [Coro]
    const rawLines = lyrics
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0 && !/^\[.*\]$/.test(l));

    if (rawLines.length === 0) return null;

    // Enforce 200-char max per line by soft-wrapping at word boundaries
    const lines: string[] = [];
    for (const ln of rawLines) {
      if (ln.length <= 200) { lines.push(ln); continue; }
      const words = ln.split(/\s+/);
      let buf = '';
      for (const w of words) {
        if ((buf + ' ' + w).trim().length > 200) {
          if (buf) lines.push(buf.trim());
          buf = w;
        } else {
          buf = (buf + ' ' + w).trim();
        }
      }
      if (buf) lines.push(buf.trim());
    }

    // Distribute lines across vocal sections as evenly as possible
    const buckets: string[][] = vocalIdxs.map(() => []);
    lines.forEach((line, i) => buckets[i % buckets.length].push(line));

    vocalIdxs.forEach((sIdx, k) => {
      const sectionLines = buckets[k];
      if (sectionLines.length > 0) {
        // ElevenLabs Music API requires `lines` as string[]
        sections[sIdx].lines = sectionLines;
      }
    });

    // Ensure every section has the required `negative_local_styles` field
    sections.forEach((s: any) => {
      if (!Array.isArray(s.negative_local_styles)) {
        s.negative_local_styles = [];
      }
      // Drop legacy `lyrics` string if present (API rejects it)
      if (typeof s.lyrics === 'string') {
        delete s.lyrics;
      }
    });

    plan.sections = sections;

    // Required at the root level alongside positive_global_styles
    if (!Array.isArray(plan.positive_global_styles)) {
      plan.positive_global_styles = [];
    }
    if (!Array.isArray(plan.negative_global_styles)) {
      plan.negative_global_styles = [];
    }

    return plan;
  } catch (err) {
    console.warn('[GENERATE-AUDIO] composition-plan exception:', err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Rate limiting: max 3 generations per user in 60 seconds
    const AUDIO_LIMIT = 3;
    const WINDOW_SECS = 60;
    const windowStart = new Date(Date.now() - WINDOW_SECS * 1000).toISOString();

    const { count: recentCalls } = await supabaseAdmin
      .from('ai_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('function_name', 'generate-audio')
      .gte('called_at', windowStart);

    if ((recentCalls ?? 0) >= AUDIO_LIMIT) {
      return new Response(
        JSON.stringify({
          error: 'rate_limit_exceeded',
          message: `Máximo ${AUDIO_LIMIT} generaciones por minuto. Espera unos segundos e inténtalo de nuevo.`,
          retryAfter: WINDOW_SECS,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(WINDOW_SECS) } }
      );
    }

    await supabaseAdmin.from('ai_rate_limits').insert({ user_id: userId, function_name: 'generate-audio' });

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { prompt, lyrics, genre, mood, duration, mode, description } = await req.json();

    // Server-side validation: prompt and description must not exceed 2500 characters
    const MAX_LENGTH = 2500;
    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'Prompt required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    if (prompt.length > MAX_LENGTH) {
      return new Response(JSON.stringify({ error: `Prompt exceeds maximum length of ${MAX_LENGTH} characters` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    if (description && typeof description === 'string' && description.length > MAX_LENGTH) {
      return new Response(JSON.stringify({ error: `Description exceeds maximum length of ${MAX_LENGTH} characters` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── Credit deduction (cost from feature_costs table) ──────
    const featureKey = mode === 'song' ? 'generate_audio_song' : 'generate_audio';
    const { data: costRow } = await supabaseAdmin
      .from('feature_costs')
      .select('credit_cost')
      .eq('feature_key', featureKey)
      .maybeSingle();
    const CREDITS_COST = costRow?.credit_cost ?? (mode === 'song' ? 3 : 2);

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('available_credits')
      .eq('user_id', userId)
      .single();

    if (!profile || profile.available_credits < CREDITS_COST) {
      return new Response(JSON.stringify({ error: 'insufficient_credits', available: profile?.available_credits ?? 0, required: CREDITS_COST }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Deduct credits upfront
    await supabaseAdmin.from('profiles').update({
      available_credits: profile.available_credits - CREDITS_COST,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId).eq('available_credits', profile.available_credits);

    await supabaseAdmin.from('credit_transactions').insert({
      user_id: userId,
      amount: -CREDITS_COST,
      type: 'usage',
      description: `Generación audio (${mode || 'instrumental'}): ${prompt.slice(0, 80)}`,
    });

    // ── Helper to refund on failure ──
    const refundCredits = async (reason: string) => {
      const { data: p } = await supabaseAdmin.from('profiles').select('available_credits').eq('user_id', userId).single();
      if (p) {
        await supabaseAdmin.from('profiles').update({
          available_credits: p.available_credits + CREDITS_COST,
          updated_at: new Date().toISOString(),
        }).eq('user_id', userId);
        await supabaseAdmin.from('credit_transactions').insert({
          user_id: userId,
          amount: CREDITS_COST,
          type: 'refund',
          description: `Reembolso: ${reason}`.slice(0, 200),
        });
        console.log(`[GENERATE-AUDIO] Refunded ${CREDITS_COST} credits to user ${userId}: ${reason}`);
      }
    };

    // Build enriched prompt for ElevenLabs Music API
    const parts: string[] = [];
    if (genre) parts.push(genre);
    if (mood) parts.push(mood);
    if (mode === 'song') parts.push('song with vocals');
    if (mode === 'instrumental') parts.push('instrumental');
    const cleanPrompt = prompt
      .replace(/["«»""]/g, '')
      .replace(/\b(estilo|style)\s+(de|of)\s+.{1,60}/gi, '')
      .trim();
    if (cleanPrompt) parts.push(cleanPrompt);
    const enrichedPrompt = parts.join('. ');

    const durationSecs = duration || 60;
    const durationMs = durationSecs * 1000;
    const hasUserLyrics = typeof lyrics === 'string' && lyrics.trim().length > 0 && mode === 'song';

    // Pre-build composition plan if user provided lyrics
    let compositionPlan: any | null = null;
    if (hasUserLyrics) {
      console.log(`[GENERATE-AUDIO] Building composition plan for user lyrics (${lyrics.length} chars)`);
      compositionPlan = await buildCompositionPlan(enrichedPrompt, lyrics.trim(), durationMs, ELEVENLABS_API_KEY);
      if (!compositionPlan) {
        console.warn('[GENERATE-AUDIO] composition plan unavailable — falling back to prompt-only mode');
      }
    }

    console.log(`[GENERATE-AUDIO] ElevenLabs Music: mode=${mode || 'song'} | plan=${compositionPlan ? 'yes' : 'no'} | "${enrichedPrompt.substring(0, 100)}"`);

    // ── ElevenLabs call (mutually exclusive: plan OR prompt) ──
    const callElevenLabs = async (planOrPrompt: { plan?: any; promptText?: string }) => {
      const body: Record<string, unknown> = { music_length_ms: durationMs };
      if (planOrPrompt.plan) {
        body.composition_plan = planOrPrompt.plan;
      } else {
        body.prompt = planOrPrompt.promptText;
      }
      return fetch('https://api.elevenlabs.io/v1/music', {
        method: 'POST',
        headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    };

    let response = compositionPlan
      ? await callElevenLabs({ plan: compositionPlan })
      : await callElevenLabs({ promptText: enrichedPrompt });

    // If prompt was rejected (bad_prompt), retry with the suggested prompt
    if (!response.ok && response.status === 400) {
      const errText = await response.text();
      console.warn(`[GENERATE-AUDIO] Request rejected (400): ${errText.substring(0, 200)}`);

      // If the failure came from composition_plan, retry once in prompt-only mode
      if (compositionPlan) {
        console.log('[GENERATE-AUDIO] Retrying without composition plan (prompt-only fallback)');
        response = await callElevenLabs({ promptText: enrichedPrompt });
        if (!response.ok) {
          const retryErr = await response.text();
          await refundCredits(`Fallo plan + prompt: ${response.status}`);
          return new Response(
            JSON.stringify({ error: `Generation failed: ${response.status}`, details: retryErr }),
            { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        try {
          const errJson = JSON.parse(errText);
          const detail = errJson?.detail || errJson;
          const suggestion = detail?.data?.prompt_suggestion;

          if (detail?.status === 'bad_prompt' && suggestion) {
            console.log(`[GENERATE-AUDIO] Retrying with suggested prompt: "${suggestion.substring(0, 100)}"`);
            response = await callElevenLabs({ promptText: suggestion });

            if (!response.ok) {
              const retryErr = await response.text();
              console.error(`[GENERATE-AUDIO] Retry also failed: ${response.status} - ${retryErr}`);
              await refundCredits(`Fallo generación audio (reintento): ${response.status}`);
              return new Response(
                JSON.stringify({ error: `Generation failed on retry: ${response.status}`, details: retryErr }),
                { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          } else {
            await refundCredits(`Prompt rechazado: ${errText.slice(0, 100)}`);
            return new Response(
              JSON.stringify({ error: `Generation failed: 400`, details: errText }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch {
          await refundCredits(`Fallo generación audio: 400`);
          return new Response(
            JSON.stringify({ error: `Generation failed: 400`, details: errText }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } else if (!response.ok) {
      const errText = await response.text();
      console.error(`[GENERATE-AUDIO] ElevenLabs error: ${response.status} - ${errText}`);

      await refundCredits(`Error ElevenLabs: ${response.status}`);

      // Map provider errors to a standardized code for user-friendly frontend handling
      if (response.status === 401 || response.status === 402 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: 'provider_unavailable' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'provider_rate_limit' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'provider_unavailable' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = base64Encode(audioBuffer);
    const audioBytes = new Uint8Array(audioBuffer);

    console.log(`[GENERATE-AUDIO] Success! Audio size: ${audioBuffer.byteLength} bytes, ${CREDITS_COST} credits charged${compositionPlan ? ' (with composition plan)' : ''}`);

    // ── Persist to storage + ai_generations ──
    let savedAudioUrl: string | null = null;
    let generationId: string | null = null;
    try {
      const fileName = `${userId}/gen_${Date.now()}.mp3`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from('ai-generations')
        .upload(fileName, audioBytes, { contentType: 'audio/mpeg', upsert: false });

      if (uploadError) {
        console.error('[GENERATE-AUDIO] Upload error:', uploadError);
      } else {
        const { data: urlData } = await supabaseAdmin.storage.from('ai-generations').createSignedUrl(fileName, 60 * 60 * 24 * 365);
        savedAudioUrl = urlData?.signedUrl || null;

        const { data: gen } = await supabaseAdmin.from('ai_generations').insert({
          user_id: userId,
          prompt: description ? `${description.slice(0, MAX_LENGTH)}\n\n---\n\n${prompt}` : prompt,
          audio_url: savedAudioUrl,
          duration: durationSecs,
          genre: genre || null,
          mood: mood || null,
        }).select('id').single();

        generationId = gen?.id || null;
        console.log(`[GENERATE-AUDIO] Saved generation: ${generationId}`);
      }
    } catch (persistErr) {
      console.error('[GENERATE-AUDIO] Persist error (non-fatal):', persistErr);
    }

    return new Response(
      JSON.stringify({
        audio: base64Audio,
        format: 'audio/mpeg',
        duration: durationSecs,
        provider: 'elevenlabs',
        status: 'completed',
        generationId,
        audioUrl: savedAudioUrl,
        usedCompositionPlan: !!compositionPlan,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[GENERATE-AUDIO] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
