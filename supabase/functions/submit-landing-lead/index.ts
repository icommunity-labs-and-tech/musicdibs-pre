import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Landing de campaña (/registro-gratis): recibe el formulario público,
 * guarda el lead en `contact_submissions` (subject prefijado con
 * LEAD_SUBJECT_PREFIX para poder contarlos en admin/campaigns) y envia un
 * aviso por email a info@musicdibs.com via Resend.
 *
 * No crea usuarios ni toca auth: es solo captacion previa al registro, para
 * medir cuantos leads llegan antes de pagar por clic.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export const LEAD_SUBJECT_PREFIX = "Lead landing campaña";
const LEAD_NOTIFY_TO = "info@musicdibs.com";

interface LeadPayload {
  name?: string;
  email?: string;
  profile?: string;
  message?: string;
  language?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  gclid?: string;
  referrer?: string;
  website?: string; // honeypot
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 8;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    if (isRateLimited(clientIp)) {
      return new Response(
        JSON.stringify({ error: "rate_limited" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload: LeadPayload = await req.json();

    // Honeypot: bots rellenan el campo oculto. Respondemos OK para no darles pistas.
    if (payload.website && payload.website.trim().length > 0) {
      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const name = (payload.name || "").trim().slice(0, 100);
    const email = (payload.email || "").trim().toLowerCase().slice(0, 255);
    const profile = (payload.profile || "").trim().slice(0, 60);
    const note = (payload.message || "").trim().slice(0, 2000);
    const language = (payload.language || "es").slice(0, 5);

    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: "invalid_payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const attribution = [
      payload.utm_source && `utm_source: ${payload.utm_source}`,
      payload.utm_medium && `utm_medium: ${payload.utm_medium}`,
      payload.utm_campaign && `utm_campaign: ${payload.utm_campaign}`,
      payload.gclid && `gclid: ${payload.gclid}`,
      payload.referrer && `referrer: ${payload.referrer}`,
    ].filter(Boolean).join("\n").slice(0, 1000);

    const subject = `${LEAD_SUBJECT_PREFIX}${profile ? ` · ${profile}` : ""}`;
    const body = [
      profile ? `Perfil: ${profile}` : null,
      `Idioma: ${language}`,
      note ? `\nMensaje:\n${note}` : null,
      attribution ? `\nAtribución:\n${attribution}` : null,
    ].filter(Boolean).join("\n");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { error: dbError } = await supabase.from("contact_submissions").insert({
      name,
      email,
      subject: subject.slice(0, 200),
      message: body.slice(0, 5000),
    });

    if (dbError) {
      console.error("[LANDING-LEAD] insert failed:", dbError.message);
      return new Response(
        JSON.stringify({ error: "save_failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "MusicDibs <noreply@notify.musicdibs.com>",
            to: [LEAD_NOTIFY_TO],
            reply_to: email,
            subject: `🎯 ${subject} — ${name}`,
            html: `
              <h2>Nuevo lead desde la landing de campaña</h2>
              <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
              <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
              ${profile ? `<p><strong>Perfil:</strong> ${escapeHtml(profile)}</p>` : ""}
              <p><strong>Idioma:</strong> ${escapeHtml(language)}</p>
              ${note ? `<p><strong>Mensaje:</strong><br/>${escapeHtml(note).replace(/\n/g, "<br/>")}</p>` : ""}
              ${attribution ? `<p><strong>Atribución:</strong><br/>${escapeHtml(attribution).replace(/\n/g, "<br/>")}</p>` : ""}
            `,
          }),
        });
        if (!res.ok) console.error("[LANDING-LEAD] resend failed:", await res.text());
      } catch (mailErr) {
        console.error("[LANDING-LEAD] resend exception:", String(mailErr));
      }
    } else {
      console.warn("[LANDING-LEAD] RESEND_API_KEY not set, email notification skipped");
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[LANDING-LEAD] unhandled:", String(e));
    return new Response(
      JSON.stringify({ error: "internal_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
