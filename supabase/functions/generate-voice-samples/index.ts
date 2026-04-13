import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Map each voice profile to an ElevenLabs TTS voice + sample text.
 * Uses the TTS API (available on all plans) instead of the Music API (paid-only).
 */
const VOICE_CONFIG: Record<string, { voiceId: string; text: string; style: number }> = {
  'female-pop': {
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    style: 0.8,
    text: 'Na na na na na, oh oh, I feel the beat inside my heart tonight... La la la la la, dancing under neon lights, you make me feel so alive, oh yeah yeah yeah... Na na na...',
  },
  'female-rb': {
    voiceId: 'FGY2WhTYpPnrIDTdsKH5',
    style: 0.85,
    text: 'Ooh baby, ooh yeah... Feel the groove, feel the vibe tonight, oh oh oh... Smooth like velvet, sweet like honey, ooh... You got me feeling some kind of way, mmm yeah...',
  },
  'female-latin': {
    voiceId: 'FGY2WhTYpPnrIDTdsKH5',
    style: 0.85,
    text: 'Dale, dale, muévete así, oh oh oh... Siente el fuego, siente el poder, la la la... El reggaetón corre por mis venas, pa pa pa, puro ritmo latino, yeah yeah...',
  },
  'female-ballad': {
    voiceId: 'pFZP5JQG7iQjIQuC4Bku',
    style: 0.7,
    text: 'Ooh... Cuando cierro los ojos te veo a ti... mmm... Each whisper of the wind, oh, reminds me of your touch... La la la, a melody, just for you, ooh ooh...',
  },
  'female-rock': {
    voiceId: 'Xb7hH8MSUJpSbSDYk0k2',
    style: 0.9,
    text: 'Yeah yeah yeah! Turn it up, turn it loud! Oh oh oh, we are the fire, we are the storm! Na na na na, rock and roll will never die, oh yeah!',
  },
  'male-pop': {
    voiceId: 'TX3LPaxmHKxFdv7VOQHJ',
    style: 0.8,
    text: 'Oh oh oh, every day is a new beginning, yeah yeah... La la la la, shining bright like a star tonight... Na na na, let\'s make this moment last forever, oh oh...',
  },
  'male-trap': {
    voiceId: 'bIHbv24MWmeRgasZH58o',
    style: 0.9,
    text: 'Yeah yeah, skrrt, riding through the night, oh... The bass hits hard, boom boom, we don\'t stop, nah nah... From the block to the top, yeah yeah, let\'s go...',
  },
  'male-latin': {
    voiceId: 'onwK4e9ZLuTAKqWW03F9',
    style: 0.85,
    text: 'Eh eh, yo soy del barrio, oye... Pa pa pa, reggaetón y trap, eso es lo que suena, dale... Oh oh oh, prende la calle que la noche es nuestra, yeah yeah...',
  },
  'male-rock': {
    voiceId: 'nPczCjzI2devNBz1zQrb',
    style: 0.9,
    text: 'Oh oh oh yeah! Rock and roll will never die! Na na na na na, feel the power, feel the fire! Yeah yeah, we are the anthem, oh oh, let\'s rock this world!',
  },
  'male-ballad': {
    voiceId: 'CwhRBWXzGAHq8TQ4Fs17',
    style: 0.7,
    text: 'Ooh... In the silence of the night, I think of you... mmm... My heart sings a melody, la la la, only you can hear... Ooh, forever yours, forever true...',
  },
  'male-flamenco': {
    voiceId: 'onwK4e9ZLuTAKqWW03F9',
    style: 0.95,
    text: 'Ay ay ay, siento el duende en mi alma, olé... Ay, el compás me lleva, me arrastra, ay ay... Con pasión y con fuerza, así canto yo, ay, desde lo más hondo...',
  },
  'child-young': {
    voiceId: 'Xb7hH8MSUJpSbSDYk0k2',
    style: 0.75,
    text: 'La la la, hey hey, let\'s have fun today! Oh oh oh, the sun is shining bright! Na na na na na, young and free, let\'s sing and dance together, yeah!',
  },
  'choir': {
    voiceId: 'JBFqnCBsd6RMkjVDRZzb',
    style: 0.8,
    text: 'Oh oh oh, together we rise, together we sing... La la la la la, voices unite in harmony... Ooh, a chorus of hope, a choir of dreams, oh oh oh...',
  },
  'vintage-crooner': {
    voiceId: 'pqHfZKP75CvOlQylNhV4',
    style: 0.75,
    text: 'Doo doo doo, come fly with me, oh yeah... La da da da da, every note is magic, mmm... Smooth and charming, ba da ba, that\'s the crooner way, oh...',
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing ELEVENLABS_API_KEY' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const { voice_id: targetId, force = false } = body;

    let query = supabase.from('voice_profiles').select('*').eq('active', true);
    if (targetId) query = query.eq('id', targetId);
    if (!force && !targetId) query = query.is('sample_url', null);

    const { data: profiles, error: profilesError } = await query;
    if (profilesError) throw profilesError;
    if (!profiles?.length) {
      return new Response(JSON.stringify({ message: 'No profiles to generate', generated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: any[] = [];

    for (const profile of profiles) {
      try {
        const config = VOICE_CONFIG[profile.id];
        if (!config) {
          results.push({ id: profile.id, status: 'skipped', error: 'No TTS config for this profile' });
          continue;
        }

        // Use ElevenLabs TTS API (available on all plans)
        const ttsRes = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${config.voiceId}?output_format=mp3_44100_128`,
          {
            method: 'POST',
            headers: {
              'xi-api-key': ELEVENLABS_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: config.text,
              model_id: 'eleven_multilingual_v2',
              voice_settings: {
                stability: 0.3,
                similarity_boost: 0.8,
                style: config.style,
                use_speaker_boost: true,
              },
            }),
          },
        );

        if (!ttsRes.ok) {
          const err = await ttsRes.text();
          results.push({ id: profile.id, status: 'error', error: err });
          continue;
        }

        const audioBuffer = new Uint8Array(await ttsRes.arrayBuffer());

        const fileName = `${profile.id}.mp3`;
        const { error: uploadError } = await supabase.storage
          .from('voice-samples')
          .upload(fileName, audioBuffer, { contentType: 'audio/mpeg', upsert: true });

        if (uploadError) {
          results.push({ id: profile.id, status: 'error', error: uploadError.message });
          continue;
        }

        const { data: urlData } = supabase.storage.from('voice-samples').getPublicUrl(fileName);

        await supabase.from('voice_profiles').update({
          sample_url: urlData.publicUrl,
          sample_generated_at: new Date().toISOString(),
        }).eq('id', profile.id);

        results.push({ id: profile.id, status: 'ok', url: urlData.publicUrl });

        // Rate limit: wait 1s between TTS calls
        await new Promise((r) => setTimeout(r, 1000));
      } catch (err: any) {
        results.push({ id: profile.id, status: 'error', error: err.message });
      }
    }

    return new Response(JSON.stringify({
      generated: results.filter((r) => r.status === 'ok').length,
      errors: results.filter((r) => r.status === 'error').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
