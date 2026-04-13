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
const VOICE_CONFIG: Record<string, { voiceId: string; text: string }> = {
  'female-pop': {
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah
    text: 'La la la, siento la música en mi corazón. Every beat makes me feel alive, every note takes me higher and higher. This is the sound of pop.',
  },
  'female-rb': {
    voiceId: 'FGY2WhTYpPnrIDTdsKH5', // Laura
    text: 'Oh baby, feel the groove tonight. Let the rhythm take control of your soul. Smooth and soulful, that\'s how we roll, R&B all night long.',
  },
  'female-latin': {
    voiceId: 'FGY2WhTYpPnrIDTdsKH5', // Laura
    text: 'Dale, muévete al ritmo del reggaetón. Siente la fuerza, siente el poder. La música latina corre por mis venas, puro fuego.',
  },
  'female-ballad': {
    voiceId: 'pFZP5JQG7iQjIQuC4Bku', // Lily
    text: 'Cuando cierro los ojos, te veo a ti. Each whisper of the wind reminds me of your gentle touch. A tender melody, just for you.',
  },
  'female-rock': {
    voiceId: 'Xb7hH8MSUJpSbSDYk0k2', // Alice
    text: 'Turn it up! Feel the power of rock and roll. We are unstoppable, we are the fire. Raise your voice and let the world hear you scream!',
  },
  'male-pop': {
    voiceId: 'TX3LPaxmHKxFdv7VOQHJ', // Liam
    text: 'Every day is a new beginning, a new chance to shine. Pop music runs through my veins. Let\'s make this moment last forever.',
  },
  'male-trap': {
    voiceId: 'bIHbv24MWmeRgasZH58o', // Will
    text: 'Yeah, trap life, we ride through the night. The bass hits hard, the beat don\'t stop. From the streets to the top, we never quit.',
  },
  'male-latin': {
    voiceId: 'onwK4e9ZLuTAKqWW03F9', // Daniel
    text: 'Yo soy del barrio, soy latino hasta la médula. Reggaetón y trap, eso es lo que suena. Prende la calle, que la noche es nuestra.',
  },
  'male-rock': {
    voiceId: 'nPczCjzI2devNBz1zQrb', // Brian
    text: 'Rock and roll will never die! Feel the guitar ripping through the air. We are the anthem, we are the storm. Let\'s rock this world!',
  },
  'male-ballad': {
    voiceId: 'CwhRBWXzGAHq8TQ4Fs17', // Roger
    text: 'In the silence of the night, I think of you. My heart sings a melody only you can hear. A love so deep, so true, forever yours.',
  },
  'male-flamenco': {
    voiceId: 'onwK4e9ZLuTAKqWW03F9', // Daniel
    text: 'Olé, siento el duende en mi alma. El compás del flamenco me lleva, me arrastra. Con pasión y con fuerza, así canto yo, desde lo más hondo.',
  },
  'child-young': {
    voiceId: 'Xb7hH8MSUJpSbSDYk0k2', // Alice (youthful)
    text: 'Hey, let\'s have fun today! The sun is shining and the music is playing. Young and free, that\'s what we are. Let\'s dance and sing together!',
  },
  'choir': {
    voiceId: 'JBFqnCBsd6RMkjVDRZzb', // George
    text: 'Together we rise, together we sing. Our voices unite in harmony and power. A chorus of hope, a choir of dreams. Let the world hear our song.',
  },
  'vintage-crooner': {
    voiceId: 'pqHfZKP75CvOlQylNhV4', // Bill
    text: 'Come fly with me, let\'s fly away. In the golden age of music, every note was magic. Smooth, charming, and timeless. That\'s the crooner way.',
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
                stability: 0.4,
                similarity_boost: 0.75,
                style: 0.6,
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
