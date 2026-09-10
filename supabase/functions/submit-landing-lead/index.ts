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

// MailerLite groups: "Registrados (No compra)" -- segmento mas cercano
// disponible para nutrir leads de landing que aun no tienen cuenta.
const ML_GROUPS_NO_PURCHASE: Record<"ES" | "EN" | "BR", string> = {
  ES: "180552557100270838",
  EN: "180552563766068699",
  BR: "184095895331013822",
};

function detectMlLang(input?: string): "ES" | "EN" | "BR" {
  const l = (input || "es").toLowerCase();
  if (l.startsWith("pt") || l === "br") return "BR";
  if (l.startsWith("en")) return "EN";
  return "ES";
}

async function generateReplyDraft(
  anthropicKey: string,
  lead: { name: string; profile: string; message: string; language: string },
): Promise<string | null> {
  const langLabel = lead.language.startsWith("pt")
    ? "portugués de Brasil"
    : lead.language.startsWith("en")
    ? "inglés"
    : "español";

  const systemPrompt = `Eres un asistente de ventas de MusicDibs (musicdibs.com), una plataforma de registro de obras musicales en blockchain, distribución a 220+ plataformas (100% de royalties, sin comisión) y herramientas de creación musical con IA.

Catálogo de referencia (usa solo lo relevante, no listes todo):
- Cuenta gratuita: 3 créditos de bienvenida (1 crédito = 1 registro de obra).
- Planes anuales de créditos: 20 (19,90€), 100 (59,90€), 200 (109,90€), 300 (149,90€), 500 (229,90€), 1000 (399,90€).
- Incluye: registro con certificado blockchain válido en 180+ países, distribución a Spotify/Apple Music/YouTube Music y demás, generador de canciones con IA, mejora de audio (masterización) con IA.

Escribe un borrador de respuesta breve (máx. 120 palabras), cálido y directo, en ${langLabel}, dirigido a esta persona por su nombre. Responde específicamente a lo que escribió en su mensaje (si menciona un número de canciones, una letra, o cualquier detalle concreto, reconócelo y ajusta la recomendación de plan al volumen si aplica). Si el mensaje es ambiguo o no da pistas claras, sé más general pero igual de cálido, y termina con una pregunta abierta para conocer más su proyecto. Incluye siempre un enlace a https://musicdibs.com para crear la cuenta. No incluyas saludo/despedida tipo "Estimado" formal; usa un tono cercano. Responde solo con el cuerpo del email, sin asunto ni explicaciones adicionales.`;

  const userPrompt = `Nombre: ${lead.name}\nPerfil: ${lead.profile || "no especificado"}\nMensaje del lead: ${lead.message || "(sin mensaje)"}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (!res.ok) {
      console.error("[LANDING-LEAD] draft generation failed:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data.content?.[0]?.text?.trim() || null;
  } catch (e) {
    console.error("[LANDING-LEAD] draft generation exception:", String(e));
    return null;
  }
}

async function addToMailerLite(email: string, name: string, lang: "ES" | "EN" | "BR", fields: Record<string, string>) {
  const ML_KEY = Deno.env.get("MAILERLITE_API_KEY");
  if (!ML_KEY) {
    console.log("[LANDING-LEAD] MAILERLITE_API_KEY not set, skipping ML");
    return false;
  }
  const groupId = ML_GROUPS_NO_PURCHASE[lang];
  try {
    const res = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: { Authorization: `Bearer ${ML_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, groups: [groupId], status: "active", fields }),
    });
    if (!res.ok) {
      console.error(`[LANDING-LEAD] ML error ${res.status}`, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[LANDING-LEAD] ML exception", String(e));
    return false;
  }
}

// Autorespuesta al lead en su idioma -- hasta ahora solo se notificaba a
// info@musicdibs.com, el lead nunca recibia confirmacion de que su mensaje
// se habia recibido.
const AUTORESPONSE: Record<"ES" | "EN" | "BR", { subject: string; html: (name: string) => string }> = {
  ES: {
    subject: "Hemos recibido tu mensaje — MusicDibs",
    html: (name) => `
      <p>Hola ${escapeHtml(name)},</p>
      <p>Gracias por tu interés en MusicDibs. Hemos recibido tu mensaje y en breve nos pondremos en contacto contigo.</p>
      <p>Mientras tanto, puedes crear tu cuenta gratuita y empezar a registrar tus obras en <a href="https://musicdibs.com">musicdibs.com</a>.</p>
      <p>Un saludo,<br/>Equipo de MusicDibs</p>
    `,
  },
  EN: {
    subject: "We've received your message — MusicDibs",
    html: (name) => `
      <p>Hi ${escapeHtml(name)},</p>
      <p>Thanks for your interest in MusicDibs. We've received your message and will get back to you shortly.</p>
      <p>In the meantime, you can create your free account and start registering your works at <a href="https://musicdibs.com">musicdibs.com</a>.</p>
      <p>Best,<br/>The MusicDibs Team</p>
    `,
  },
  BR: {
    subject: "Recebemos sua mensagem — MusicDibs",
    html: (name) => `
      <p>Olá ${escapeHtml(name)},</p>
      <p>Obrigado pelo seu interesse na MusicDibs. Recebemos sua mensagem e entraremos em contato em breve.</p>
      <p>Enquanto isso, você já pode criar sua conta gratuita e começar a registrar suas obras em <a href="https://musicdibs.com">musicdibs.com</a>.</p>
      <p>Atenciosamente,<br/>Equipe MusicDibs</p>
    `,
  },
};

async function sendAutoresponse(resendKey: string, to: string, name: string, lang: "ES" | "EN" | "BR") {
  const tpl = AUTORESPONSE[lang];
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "MusicDibs <noreply@notify.musicdibs.com>",
        to: [to],
        subject: tpl.subject,
        html: tpl.html(name),
      }),
    });
    if (!res.ok) {
      console.error(`[LANDING-LEAD] autoresponse error ${res.status}`, (await res.text()).slice(0, 300));
    }
  } catch (e) {
    console.error("[LANDING-LEAD] autoresponse exception", String(e));
  }
}

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

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    let aiDraft: string | null = null;
    if (ANTHROPIC_API_KEY) {
      aiDraft = await generateReplyDraft(ANTHROPIC_API_KEY, { name, profile, message: note, language });
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
              ${aiDraft ? `<hr/><p><strong>✏️ Borrador de respuesta sugerido (revisar antes de enviar):</strong></p><div style="background:#f5f5f5;padding:12px;border-radius:6px;white-space:pre-wrap;">${escapeHtml(aiDraft)}</div><p style="font-size:12px;color:#888;">Responde directamente a este correo (reply-to ya apunta a ${escapeHtml(email)}) para enviarlo.</p>` : ""}
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

    // Autorespuesta al lead + alta en MailerLite -- mejoras 2 y 3 (best-effort,
    // no bloquean la respuesta al usuario si alguna falla).
    const mlLang = detectMlLang(language);
    if (RESEND_API_KEY) {
      await sendAutoresponse(RESEND_API_KEY, email, name, mlLang);
    }
    await addToMailerLite(email, name, mlLang, {
      origen: "lead_ads_landing",
      perfil: profile || "",
      gclid: payload.gclid || "",
      utm_campaign: payload.utm_campaign || "",
    });

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
