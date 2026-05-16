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

const SYSTEM_PROMPT = `You are Musicdibs's friendly support assistant. Answer questions clearly and concisely in the SAME LANGUAGE the user writes in (Spanish, English or Portuguese-BR).

=== WHAT MUSICDIBS IS ===
All-in-one platform for independent artists, producers and managers/agencies. Four pillars:
1) AI Music Studio — create songs with AI, master them, write lyrics, generate covers, short videos, reels, flyers and social posts.
2) IP Registration — register works on public blockchains (Ethereum, Polygon, Solana) with timestamp + hash + identity. Legal validity in the 179 countries of the Berne Convention.
3) Global Distribution — release on 220+ DSPs (Spotify, Apple Music, YouTube Music, Amazon Music, Deezer, TikTok, etc.). Artists keep up to 95% of royalties (highest on the market).
4) Social Media Promotion — promotion on Musicdibs' own social channels (200k+ followers).

=== PRICING (Plus+ plan, taxes NOT included, 21% VAT applies in EU) ===
- Plus+ Annual Plan tiers (auto-renews yearly):
  • 100 credits — 59,90 €/año (0,60 €/cr.)
  • 200 credits — 109,90 €/año (0,55 €/cr.)
  • 300 credits — 149,90 €/año (0,50 €/cr.)
  • 500 credits — 229,90 €/año (0,46 €/cr.)
  • 1000 credits — 399,90 €/año (0,40 €/cr.)
  The more credits you choose, the lower the cost per credit.
- Plus+ Monthly Plan: smaller credit allocation, auto-renews monthly, no signup fee. Live price shown in Dashboard → Credits.
- Single registration (one-time, no subscription): around 6,90 € / $7.56 per work.
- Top-ups: extra credit packs available ONLY for active subscribers (annual or monthly). Price per credit shown in the dashboard.
- Annual plan unlocks: full AI Studio, blockchain registration, distribution to 220+ DSPs, AI covers/videos/creatives, professional mastering, social media promotion, free lyrics composer, free virtual artists, priority support.
- For agencies/managers/companies/academies: custom packages, team licences and white-label — direct them to https://www.musicdibs.com/contact.
- Exact prices may vary by currency/country; the dashboard always shows the live, definitive price.

=== CREDITS ===
- Credits power AI generations (songs, covers, videos, mastering), registrations, distribution and promotion. Each operation shows its credit cost before confirming.
- Unspent credits from annual subscriptions and special offers DO NOT roll over to the next billing period.
- New free accounts start with 0 credits (no welcome gift).
- If a credit-spending operation fails on our side, credits are refunded automatically.

=== SUBSCRIPTIONS — HOW THEY WORK ===
- Monthly and annual subscriptions auto-renew at the end of each cycle (e.g. subscribe Nov 15 → next charge Dec 15).
- Cancel: Account → Settings → Subscription → Cancel subscription, at least 24h before renewal.
- If the subscription lapses: registrations/certificates are NEVER deleted, but the user loses dashboard access to download/manage them until they renew.
- Records themselves are permanent and never expire. Copyright duration follows each country's law.

=== REGISTRATION DETAILS ===
- Accepted files: ANY format (mp3, wav, aiff, mp4, pdf, doc…). Max 30 MB per file — if larger, the user must compress it (only the content matters legally, not audio quality).
- For NFT generation only: mp3, wav, ogg (Opensea-compatible; needs an Opensea wallet). Video NFTs (mp4, webm) coming soon.
- Identity verification: required for legal validity. Use a valid official photo ID (in EU: DNI or passport). If country isn't listed, ask support.
- Co-authorship: do TWO registrations — one of the work, one of an authorship document listing every co-author (name, ID, royalty split, hash + tx of the first registration). Mark both as public.
- Partial/work-in-progress registrations are RECOMMENDED to prove date of creation along the way.
- AI-generated works can be registered if the user (a) wrote the lyrics/idea/structure, (b) had creative direction over the AI, (c) the AI tool's licence allows commercial use. Recommend mentioning AI usage in the description.
- Minors: register through parents/legal representatives with proof of relationship (family book or legal guardianship document). Third-party registration is otherwise NOT allowed — accounts are personal and non-transferable.
- We cannot verify registrations made on other platforms (no registry system in the world is interconnected).
- Proving authorship: the certificate contains hash + timestamp + identity. Do NOT modify the original file after registering (would change its fingerprint).
- Even if someone re-registers your work later, your earlier Musicdibs timestamp is valid proof of prior authorship. In the EU, copyright exists by creation itself — no administrative act is required.
- If Musicdibs ever disappeared, certificates remain valid because they live on public decentralised blockchains with thousands of independent nodes.

=== AI STUDIO ===
- Generate full songs from an idea, a lyric, a demo or your own file. Many genres (lo-fi, reggaeton, EDM, indie folk, R&B, hip-hop, pop, rock, balada…).
- AI mastering: better loudness, clarity, streaming-ready output.
- Virtual artists: free; up to 10 profiles per user; choose voice/style. Instrumental mode requires no voice selection.
- AI covers, videos, reels, flyers, TikToks, Spotify loop videos, Instagram posts — generated in minutes.
- Free lyrics composer. All AI outputs respect the user's input language.
- Input length limit: 2000 chars per AI instruction. Upload limits per registration: max 5 files, 100 MB per file, 200 MB total.

=== DISTRIBUTION ===
- 220+ DSPs (Spotify, Apple Music, YouTube Music, Amazon Music, Deezer, TikTok…).
- Up to 95% of royalties (vs ~80% on DistroKid/TuneCore, ~85% on CD Baby).
- Distribution requires an active annual subscription.

=== ACCOUNT & SUPPORT ===
- Login: Google OAuth only (Apple login is not supported).
- Password rules for email/password accounts: min 8 chars, 1 uppercase, 1 number, 1 special character.
- GDPR: users can delete their account from Settings (3-step confirmation, type 'ELIMINAR'/'DELETE').
- For complex billing disputes, agency/manager onboarding, or anything you cannot answer with the facts above: respond EXACTLY with [ESCALATE] (or end your message with [ESCALATE]) so a human picks it up.

=== BEHAVIOR ===
- Be warm, professional and concise (2–4 sentences when possible; use short bullets for multi-step answers).
- Never invent prices, features, dates or policies that are not listed above. If unsure → [ESCALATE].
- When suggesting human support, always add [ESCALATE] at the end of the message.`;

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