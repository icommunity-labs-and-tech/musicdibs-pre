import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── IP-based in-memory rate limiter ── */
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (timestamps.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, timestamps);
    return true;
  }
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return false;
}

const SYSTEM_PROMPT = `You are MusicDibs's friendly support assistant. Answer questions about MusicDibs clearly and concisely in the SAME LANGUAGE the user writes in.

KEY FACTS ABOUT MUSICDIBS:
- MusicDibs registers and certifies copyright using blockchain technology (Ethereum, Polygon, Solana)
- Registration has legal validity in 179 countries (Berne Convention signatories)
- Distributes music to 220+ platforms (Spotify, Apple Music, YouTube Music, etc.)
- Artists keep up to 95% of royalties
- Accepted file types: any format, max 30MB
- Subscriptions: Annual (59.90€/year) or Monthly (6.90€/month) + Individual registration (11.90€)
- Registration is permanent and never expires
- Identity verification requires official ID document with photo
- Co-authorship can be registered with two blockchain records
- Minors can register through parents/legal representatives
- AI-created works can be registered if there was creative direction from the author
- Blockchain records persist even if MusicDibs disappears (decentralized technology)
- Cancel subscription: settings → subscription → cancel subscription (24h before renewal)
- If subscription lapses, records are preserved but access to certificates is lost until renewal

BEHAVIOR:
- Be helpful, warm and professional
- Keep answers concise (2-4 sentences when possible)
- If you cannot answer a question or the user wants human help, respond EXACTLY with the text: [ESCALATE]
- Add [ESCALATE] at the end of your message when you suggest contacting support
- Never invent information about MusicDibs features or pricing not listed above`;

const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 2000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(clientIp)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
      return new Response(
        JSON.stringify({ error: "Invalid messages format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    for (const m of messages) {
      if (
        typeof m?.content !== "string" ||
        m.content.length > MAX_MESSAGE_LENGTH ||
        !["user", "assistant"].includes(m.role)
      ) {
        return new Response(
          JSON.stringify({ error: "Invalid message content" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    // Model selectable via secret without code changes.
    // Allowed values: "gemini-2.5-flash" (default) or "gemini-2.5-pro".
    const ALLOWED_MODELS = new Set(["gemini-2.5-flash", "gemini-2.5-pro"]);
    const requestedModel = (Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash").trim();
    const model = ALLOWED_MODELS.has(requestedModel) ? requestedModel : "gemini-2.5-flash";
    console.log(`chat-support using model: ${model}`);

    // Convert messages to Gemini format
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
        }),
      }
    );

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini API error:", response.status, t);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Transform Gemini SSE stream to OpenAI-compatible format
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            let newlineIndex: number;
            while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
              const line = buffer.slice(0, newlineIndex).trim();
              buffer = buffer.slice(newlineIndex + 1);

              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue;

              try {
                const event = JSON.parse(jsonStr);
                const text = event?.candidates?.[0]?.content?.parts
                  ?.map((p: { text?: string }) => p.text || "")
                  .join("") || "";

                if (text) {
                  const openaiChunk = {
                    choices: [{ delta: { content: text }, index: 0 }],
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
                }
              } catch {
                // skip unparseable lines
              }
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("Stream transform error:", err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-support error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});