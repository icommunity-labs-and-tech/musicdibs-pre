// Generación de pista vocal a capela con la voz clonada del usuario (KIE).
//
// FIX 2026-08-27 (CONFIRMADO tras varios intentos): para que KIE aplique
// el TIMBRE de una voz de referencia a una cancion generada, no basta con
// pasar un audio o un voiceId de Custom Voice directamente a /generate --
// hace falta el flujo de "Persona":
//   1. Generar una cancion de REFERENCIA con el audio de la voz (via
//      /generate/add-vocals, uploadUrl = sample_url de la clonacion).
//   2. Con el taskId/audioId de esa referencia, llamar a Generate Persona
//      (/generate/generate-persona) -> devuelve un personaId (sincrono).
//   3. Generar la cancion FINAL con ese personaId + personaModel:
//      "voice_persona" (asi se aplica como VOZ, no como estilo generico
//      -- solo soportado en el modelo V5) + la letra real del usuario.
//
// El personaId se cachea en voice_clones.persona_id -- solo hace falta
// generar la referencia una vez por voz clonada; las siguientes canciones
// con esa misma voz saltan directo al paso 3.
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

    const { lyrics, voice_id, voice_name, genre, mood, vocal_gender, style: userStyle } = await req.json();
    if (!lyrics?.trim()) return new Response(JSON.stringify({ error: 'lyrics is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (!voice_id) return new Response(JSON.stringify({ error: 'voice_id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: voiceClone } = await supabase
      .from('voice_clones')
      .select('id, status, sample_url, persona_id')
      .eq('user_id', user.id)
      .eq('provider_voice_id', voice_id)
      .maybeSingle();
    if (!voiceClone || voiceClone.status !== 'active' || voice_id.startsWith('pending_')) {
      return new Response(JSON.stringify({ error: 'invalid_voice_clone', message: 'Esta voz clonada no está lista o no se completó correctamente.' }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!voiceClone.sample_url) {
      return new Response(JSON.stringify({ error: 'invalid_voice_clone', message: 'Esta voz clonada no tiene un audio de muestra válido.' }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Coste propio (hasta 3 llamadas a KIE encadenadas cuando no hay
    // persona_id cacheado: referencia + generación final + separación;
    // 2 cuando ya esta cacheado -- ver operation_pricing).
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

    const finalStyle = userStyle || [genre, mood].filter(Boolean).join(', ') || 'Pop';
    const finalTitle = (voice_name || 'Voz clonada').slice(0, 80);

    const { data: generation, error: genErr } = await supabase.from('ai_generations').insert({
      user_id: user.id,
      prompt: `Pista vocal: ${voice_name || 'Voz clonada'} | ${genre || ''} ${mood || ''}`.trim(),
      audio_url: '', duration: 0,
      genre: genre || null,
      mood: mood || null,
      provider: 'kie_suno',
      model: 'vocal_track',
      voice_id,
      voice_name: voice_name || null,
      // Guardamos los parametros de la generacion FINAL -- si hace falta
      // generar primero una cancion de referencia, el callback de ese paso
      // los recupera de aqui para disparar la generacion real despues.
      request_payload: { formattedLyrics, finalStyle, finalTitle, vocal_gender: vocal_gender ?? null, voiceCloneId: voiceClone.id },
    }).select().single();
    if (genErr || !generation) {
      console.error('[VOCAL-TRACK] ai_generations insert failed:', { code: genErr?.code, message: genErr?.message, details: genErr?.details, hint: genErr?.hint });
      await supabase.rpc('refund_credits_ordered', { p_user_id: user.id, p_amount: CREDITS_COST, p_from_permanent: vocalDeductedFromPermanent, p_reason: 'Reembolso: fallo creando el registro de generación' });
      return new Response(JSON.stringify({ error: 'db_insert_failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const vocalGenderField = (vocal_gender === 'm' || vocal_gender === 'f') ? { vocalGender: vocal_gender } : {};

    if (voiceClone.persona_id) {
      // Ya tenemos un personaId cacheado para esta voz -- generar la
      // cancion final directamente.
      console.log(`[VOCAL-TRACK] Generating with cached personaId: ${voiceClone.persona_id}`);
      const callBackUrl = `${SUPABASE_URL}/functions/v1/kie-vocal-track-callback?generationId=${generation.id}&step=music&creditsCost=${CREDITS_COST}&fromPermanent=${vocalDeductedFromPermanent}`;
      const kieRes = await fetch('https://api.kie.ai/api/v1/generate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${KIE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: formattedLyrics, customMode: true, instrumental: false, model: 'V5',
          personaId: voiceClone.persona_id, personaModel: 'voice_persona',
          style: finalStyle, title: finalTitle, negativeTags: 'low quality, distorted, noisy',
          callBackUrl, ...vocalGenderField,
        }),
      });
      const kieJson = await kieRes.json().catch(() => ({}));
      if (!kieRes.ok || (kieJson?.code && kieJson.code !== 200)) {
        console.error('[VOCAL-TRACK] KIE generate error:', kieRes.status, kieJson);
        await supabase.rpc('refund_credits_ordered', { p_user_id: user.id, p_amount: CREDITS_COST, p_from_permanent: vocalDeductedFromPermanent, p_reason: 'Reembolso: fallo generación KIE' });
        await supabase.from('ai_generations').delete().eq('id', generation.id);
        return new Response(JSON.stringify({ error: 'provider_error', message: kieJson?.msg || `HTTP ${kieRes.status}` }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const taskId = kieJson?.data?.taskId as string | undefined;
      await supabase.from('ai_generations').update({ provider_task_id: taskId ?? null }).eq('id', generation.id).then(() => {}, () => {});
      return new Response(JSON.stringify({ success: true, processing: true, generationId: generation.id, taskId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // No hay persona_id todavia -- generar primero una cancion de
    // referencia con el audio de la voz, para poder crear el Persona.
    console.log(`[VOCAL-TRACK] No cached personaId, generating reference track first from sample: ${voiceClone.sample_url}`);
    const refCallBackUrl = `${SUPABASE_URL}/functions/v1/kie-vocal-track-callback?generationId=${generation.id}&step=reference&creditsCost=${CREDITS_COST}&fromPermanent=${vocalDeductedFromPermanent}`;
    const refRes = await fetch('https://api.kie.ai/api/v1/generate/add-vocals', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KIE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadUrl: voiceClone.sample_url,
        prompt: 'A short reference vocal performance to capture the voice timbre.',
        title: 'Referencia de voz'.slice(0, 80),
        style: 'Pop',
        negativeTags: 'low quality, distorted, noisy',
        model: 'V4_5PLUS',
        callBackUrl: refCallBackUrl,
        ...vocalGenderField,
      }),
    });
    const refJson = await refRes.json().catch(() => ({}));
    if (!refRes.ok || (refJson?.code && refJson.code !== 200)) {
      console.error('[VOCAL-TRACK] KIE add-vocals (reference) error:', refRes.status, refJson);
      await supabase.rpc('refund_credits_ordered', { p_user_id: user.id, p_amount: CREDITS_COST, p_from_permanent: vocalDeductedFromPermanent, p_reason: 'Reembolso: fallo generando la cancion de referencia' });
      await supabase.from('ai_generations').delete().eq('id', generation.id);
      return new Response(JSON.stringify({ error: 'provider_error', message: refJson?.msg || `HTTP ${refRes.status}` }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const refTaskId = refJson?.data?.taskId as string | undefined;
    await supabase.from('ai_generations').update({ provider_task_id: refTaskId ?? null }).eq('id', generation.id).then(() => {}, () => {});

    return new Response(JSON.stringify({ success: true, processing: true, generationId: generation.id, taskId: refTaskId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('[VOCAL-TRACK] Fatal:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
