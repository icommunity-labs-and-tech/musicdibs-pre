import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text || text.length < 10) {
      return new Response(JSON.stringify({ error: 'Text too short' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are an expert in music production and song description for music generation APIs like ElevenLabs Music API. Your job is to improve song descriptions making them more specific and detailed.

CRITICAL RULE: You MUST respond in the EXACT SAME LANGUAGE as the user's input text.
- If the user wrote in Spanish -> respond in Spanish
- If the user wrote in English -> respond in English
- If the user wrote in French -> respond in French
- If the user wrote in any other language -> respond in that same language
NEVER translate the response to a different language than the input.`;

    const userPrompt = `Improve this song description for ElevenLabs Music API. Make it more specific by adding:
- Detailed instrumentation (guitar, piano, drums, bass, synthesizers, etc)
- Voice type (female/male, tone, approximate age)
- Rhythm and tempo (slow, medium, fast, uptempo, downtempo)
- Mood/atmosphere (cheerful, melancholic, energetic, relaxed, etc)
- Musical structure if relevant

Keep the original genre and style. Do not invent information that is not implied. Return ONLY the improved description, no explanations.

IMPORTANT: Respond in the EXACT SAME LANGUAGE as the original text below.

Original: ${text}

Improved:`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[IMPROVE-DESC] Claude error:', response.status, errText);
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const improved = data.content?.[0]?.text?.trim() || '';

    if (!improved) {
      return new Response(JSON.stringify({ error: 'Empty response' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const finalText = improved.length > 2000 ? improved.slice(0, 1997) + '...' : improved;

    return new Response(JSON.stringify({ improved_text: finalText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[IMPROVE-DESC] Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});