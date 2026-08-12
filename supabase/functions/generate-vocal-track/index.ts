// Generación de pista vocal a capela con la voz clonada del usuario (KIE).
// Reemplaza el TTS directo de ElevenLabs, ya migrado a KIE Suno Voice.
//
// KIE no tiene un endpoint de "solo vocal a capela con voz custom" directo:
// el flujo es generar la canción COMPLETA (voz+instrumental) con el voiceId
// del usuario, y luego separar los stems para quedarnos solo con la pista
// de voz (kie-vocal-track-callback se encarga del segundo paso).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getOperationCost } from "../_shared/operation-pricing.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const KIE_API_KEY = Deno.env.get('KIE_API_KEY');
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!KIE_API_KEY) return new Response(JSON.stringify({ error: 'Missing KIE_API_KEY' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { lyrics, voice_id, voice_name, genre, mood } = await req.json();
    if (!lyrics?.trim()) return new Response(JSON.stringify({ error: 'lyrics is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (!voice_id) return new Response(JSON.stringify({ error: 'voice_id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Coste propio (2 llamadas a KIE encadenadas: generación + separación,
    // cada una facturada por KIE por separado -- ver operation_pricing).
    const CREDITS_COST = await getOperationCost(supabase, 'generate_vocal_track_kie', 2);
    let vocalDeductedFromPermanent = 0;
    {
      const { data: deductResult, error: deductError } = await supabase.rpc('deduct_credits_ordered', {
        p_user_id: user.id, p_amount: CREDITS_COST, p_feature: 'generate_vocal_track_kie',
        p_description: `Pista vocal (KIE): ${voice_name || voice_id}`,
      });
      if (deductError || !deductResult?.success) return new Response(JSON.stringify({ error: 'insufficient_credits' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      vocalDeductedFromPermanent = deductResult.from_permanent ?? 0;
    }

    let formattedLyrics = lyrics.trim();
    if (ANTHROPIC_API_KEY) {
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 800, messages: [{ role: 'user', content: `Format these song lyrics with structure tags like [Verse], [Chorus] for AI music generation. Keep all original words. Return ONLY the formatted lyrics.\n\n${lyrics}` }] })
      });
      if (claudeRes.ok) {
        const d = await claudeRes.json();
        const f = d.content?.[0]?.text?.trim();
        if (f) formattedLyrics = f;
      }
    }

    const { data: generation, error: genErr } = await supabase.from('ai_generations').insert({
      user_id: user.id, type: 'vocal_track',
      prompt: `Pista vocal: ${voice_name || 'Voz clonada'} | ${genre || ''} ${mood || ''}`.trim(),
      genre: genre || null, mood: mood || null, status: 'processing',
    }).select().single();
    if (genErr || !generation) {
      await supabase.rpc('refund_credits_ordered', { p_user_id: user.id, p_amount: CREDITS_COST, p_from_permanent: vocalDeductedFromPermanent, p_reason: 'Reembolso: fallo creando el registro de generación' });
      return new Response(JSON.stringify({ error: 'db_insert_failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const callBackUrl = `${SUPABASE_URL}/functions/v1/kie-vocal-track-callback?generationId=${generation.id}&step=music&creditsCost=${CREDITS_COST}&fromPermanent=${vocalDeductedFromPermanent}`;

    console.log(`[VOCAL-TRACK] Generating with voiceId: ${voice_id}, lyrics: ${formattedLyrics.length} chars`);

    const kieRes = await fetch('https://api.kie.ai/api/v1/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KIE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: formattedLyrics,
        customMode: true,
        instrumental: false,
        model: 'V4_5',
        voiceId: voice_id,
        style: [genre, mood].filter(Boolean).join(', ') || undefined,
        title: (voice_name || 'Voz clonada').slice(0, 80),
        callBackUrl,
      }),
    });
    const kieJson = await kieRes.json().catch(() => ({}));

    if (!kieRes.ok || (kieJson?.code && kieJson.code !== 200)) {
      console.error('[VOCAL-TRACK] KIE generate error:', kieRes.status, kieJson);
      await supabase.rpc('refund_credits_ordered', { p_user_id: user.id, p_amount: CREDITS_COST, p_from_permanent: vocalDeductedFromPermanent, p_reason: 'Reembolso: fallo generación KIE' });
      await supabase.from('ai_generations').update({ status: 'failed' }).eq('id', generation.id);
      return new Response(JSON.stringify({ error: 'provider_error', message: kieJson?.msg || `HTTP ${kieRes.status}` }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const taskId = kieJson?.data?.taskId as string | undefined;
    await supabase.from('ai_generations').update({ provider_task_id: taskId ?? null }).eq('id', generation.id).then(() => {}, () => {});

    return new Response(JSON.stringify({ success: true, processing: true, generationId: generation.id, taskId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('[VOCAL-TRACK] Fatal:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
