import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─── Pre-flight copyright risk check ─────────────────────────────────────────
// Runs BEFORE any credit deduction. Classifies the user's prompt/lyrics with
// Claude Haiku so the frontend can warn the user (and let them edit) instead
// of generating → being rejected by Suno → refunding.
//
// Fail-open: any internal error returns risk='none' so generation is never
// blocked by this validator itself.

type RiskLevel = 'none' | 'artist_names' | 'copyrighted_lyrics';

const SYSTEM_PROMPT = `You are a copyright risk classifier for an AI music generation service. You receive the user's song description ("PROMPT") and optionally user-provided lyrics ("LYRICS").

Classify the content and respond ONLY with a JSON object, no markdown, no extra text:
{"risk":"none"|"artist_names"|"copyrighted_lyrics","detected":["..."],"explanation":"..."}

Rules:
- risk="artist_names": the prompt or lyrics reference real music artists, bands or well-known performers (e.g. "estilo de Rosalía", "like Shakira", "tipo Bad Bunny"). Also use this for living public figures whose voice/persona could be imitated.
- risk="copyrighted_lyrics": the lyrics reproduce, translate or closely paraphrase lyrics from an existing published song (choruses, verses, hooks of commercial songs), or the prompt asks to recreate/cover a specific existing song.
- risk="none": original lyrics written by the user, generic style descriptions, moods, genres, themes — even if inspired by a genre.
- "detected": short list of the artist names or the matched song/fragments that triggered the classification. Empty array when risk="none".
- "explanation": one short sentence (max 20 words) in the SAME language as the user's input.
- When in doubt, prefer "none" — false warnings are worse than missed ones, because the generation provider has its own filter.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const ok = (payload: Record<string, unknown>) =>
    new Response(JSON.stringify(payload), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    // ── Auth ──
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

    // ── Payload ──
    const body = await req.json().catch(() => ({}));
    const prompt = typeof body?.prompt === 'string' ? body.prompt.slice(0, 2500).trim() : '';
    const lyrics = typeof body?.lyrics === 'string' ? body.lyrics.slice(0, 2500).trim() : '';

    if (!prompt && !lyrics) {
      return ok({ risk: 'none', detected: [] });
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      console.warn('[VALIDATE-AUDIO-CONTENT] Missing ANTHROPIC_API_KEY — fail-open');
      return ok({ risk: 'none', detected: [] });
    }

    const userContent = `PROMPT:\n${prompt || '(vacío)'}\n\nLYRICS:\n${lyrics || '(sin letra proporcionada)'}`;

    const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!anthropicResp.ok) {
      const errText = await anthropicResp.text().catch(() => '');
      console.warn(`[VALIDATE-AUDIO-CONTENT] Anthropic error ${anthropicResp.status}: ${errText.slice(0, 200)} — fail-open`);
      return ok({ risk: 'none', detected: [] });
    }

    const data = await anthropicResp.json();
    const rawText: string = data?.content?.[0]?.text ?? '';

    // Extract the JSON object from the model output
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[VALIDATE-AUDIO-CONTENT] No JSON in model response — fail-open');
      return ok({ risk: 'none', detected: [] });
    }

    let parsed: { risk?: string; detected?: unknown; explanation?: unknown };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return ok({ risk: 'none', detected: [] });
    }

    const validRisks: RiskLevel[] = ['none', 'artist_names', 'copyrighted_lyrics'];
    const risk: RiskLevel = validRisks.includes(parsed.risk as RiskLevel) ? (parsed.risk as RiskLevel) : 'none';
    const detected = Array.isArray(parsed.detected)
      ? parsed.detected.filter((d): d is string => typeof d === 'string').slice(0, 6)
      : [];
    const explanation = typeof parsed.explanation === 'string' ? parsed.explanation.slice(0, 200) : undefined;

    console.log(`[VALIDATE-AUDIO-CONTENT] user=${user.id} risk=${risk} detected=${JSON.stringify(detected)}`);

    return ok({ risk, detected, explanation });
  } catch (error) {
    console.error('[VALIDATE-AUDIO-CONTENT] Fatal (fail-open):', error);
    return ok({ risk: 'none', detected: [] });
  }
});
