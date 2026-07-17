import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cronSecret = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("Authorization");

    // Auth: cron secret o service role bearer
    const expectedSecret = Deno.env.get("CRON_SECRET");
    const authorized =
      (expectedSecret && cronSecret === expectedSecret) ||
      authHeader === `Bearer ${serviceKey}`;

    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId, workId, workTitle, checkerUrl, isFirstWork } = await req.json();
    if (!userId || !workId || !workTitle) {
      return new Response(JSON.stringify({ error: "Missing userId, workId or workTitle" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Obtener email + nombre + idioma del usuario
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, language, subscription_plan")
      .eq("user_id", userId)
      .single();

    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const email = authUser?.user?.email;
    if (!email) {
      console.error("[CERT-EMAIL] No email for userId:", userId);
      return new Response(JSON.stringify({ error: "User email not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = escapeHtml(profile?.display_name || email.split("@")[0]);
    const rawLang = (profile?.language || "es").slice(0, 2).toLowerCase();
    const lang = rawLang === "en" ? "en" : rawLang === "pt" ? "pt" : "es";
    const isFree = (profile?.subscription_plan || "Free") === "Free";
    const showUpsell = isFirstWork && isFree;

    const plansUrl = "https://musicdibs.com/dashboard/credits";
    const checkerLink = checkerUrl || "https://musicdibs.com/dashboard";
    const dashboardUrl = "https://musicdibs.com/dashboard";
    const registerUrl = "https://musicdibs.com/dashboard/register";
    const safeTitle = escapeHtml(workTitle);

    const i18n: Record<string, Record<string, string>> = {
      es: {
        subtitle: "by iCommunity · Registro de Propiedad Intelectual",
        subject: `✅ "${workTitle}" ya está protegida en blockchain`,
        heading: `¡Tu obra está protegida! 🎵`,
        intro: `<strong>${safeTitle}</strong> ha sido registrada con éxito en la blockchain. Tu autoría queda certificada de forma permanente e inmutable.`,
        certLabel: "Ver certificado en blockchain →",
        whatMeans: "¿Qué significa esto?",
        point1: "Prueba irrefutable de autoría con fecha y hora exactas.",
        point2: "Tu obra está sellada en la red Polygon con un hash único.",
        point3: "Puedes usar el enlace del certificado como evidencia legal.",
        upsellHeading: "Tienes más música sin proteger",
        upsellBody: "Esta es tu primera obra certificada. ¿Cuántas más tienes sin proteger? Con un plan anual registras todas tus obras, distribuyes en 220+ plataformas y te llevas el 95% de regalías.",
        upsellCta: "Ver planes anuales →",
        registerMore: "Registrar otra obra →",
        footer: "Este correo fue enviado porque una de tus obras fue certificada en MusicDibs.",
        panel: "Mi panel",
        support: "Soporte",
        textBody: `Tu obra "${workTitle}" ha sido registrada en blockchain. Ver certificado: ${checkerLink}`,
      },
      en: {
        subtitle: "by iCommunity · Intellectual Property Registration",
        subject: `✅ "${workTitle}" is now protected on blockchain`,
        heading: "Your work is protected! 🎵",
        intro: `<strong>${safeTitle}</strong> has been successfully registered on the blockchain. Your authorship is permanently and immutably certified.`,
        certLabel: "View blockchain certificate →",
        whatMeans: "What does this mean?",
        point1: "Irrefutable proof of authorship with exact date and time.",
        point2: "Your work is sealed on the Polygon network with a unique hash.",
        point3: "You can use the certificate link as legal evidence.",
        upsellHeading: "You have more music unprotected",
        upsellBody: "This is your first certified work. How many more do you have unprotected? With an annual plan you register all your works, distribute on 220+ platforms and keep 95% of royalties.",
        upsellCta: "See annual plans →",
        registerMore: "Register another work →",
        footer: "This email was sent because one of your works was certified on MusicDibs.",
        panel: "My dashboard",
        support: "Support",
        textBody: `Your work "${workTitle}" has been registered on blockchain. View certificate: ${checkerLink}`,
      },
      pt: {
        subtitle: "by iCommunity · Registro de Propriedade Intelectual",
        subject: `✅ "${workTitle}" já está protegida na blockchain`,
        heading: "Sua obra está protegida! 🎵",
        intro: `<strong>${safeTitle}</strong> foi registrada com sucesso na blockchain. Sua autoria está certificada de forma permanente e imutável.`,
        certLabel: "Ver certificado na blockchain →",
        whatMeans: "O que isso significa?",
        point1: "Prova irrefutável de autoria com data e hora exatas.",
        point2: "Sua obra está selada na rede Polygon com um hash único.",
        point3: "Você pode usar o link do certificado como evidência legal.",
        upsellHeading: "Você tem mais música desprotegida",
        upsellBody: "Esta é sua primeira obra certificada. Quantas mais você tem desprotegidas? Com um plano anual você registra todas as suas obras, distribui em 220+ plataformas e fica com 95% dos royalties.",
        upsellCta: "Ver planos anuais →",
        registerMore: "Registrar outra obra →",
        footer: "Este email foi enviado porque uma de suas obras foi certificada no MusicDibs.",
        panel: "Meu painel",
        support: "Suporte",
        textBody: `Sua obra "${workTitle}" foi registrada na blockchain. Ver certificado: ${checkerLink}`,
      },
    };

    const t = i18n[lang];

    const upsellBlock = showUpsell ? `
      <tr><td style="padding-top:28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
          style="background:linear-gradient(135deg,rgba(168,85,247,0.15),rgba(109,40,217,0.15));border:1px solid rgba(168,85,247,0.3);border-radius:12px;padding:24px 28px;">
          <tr><td>
            <p style="margin:0 0 8px;color:#f3f4f6;font-size:15px;font-weight:700;">🚀 ${t.upsellHeading}</p>
            <p style="margin:0 0 20px;color:#d1d5db;font-size:14px;line-height:1.6;">${t.upsellBody}</p>
            <a href="${plansUrl}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">${t.upsellCta}</a>
          </td></tr>
        </table>
      </td></tr>` : `
      <tr><td style="padding-top:24px;text-align:center;">
        <a href="${registerUrl}" style="color:#a855f7;font-size:13px;text-decoration:none;">${t.registerMore}</a>
      </td></tr>`;

    const html = `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#0d0618;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0618;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Logo -->
        <tr><td align="center" style="padding:0 0 30px;">
          <h2 style="margin:0;color:#a855f7;font-size:22px;font-weight:800;letter-spacing:1px;">MUSICDIBS</h2>
          <p style="margin:4px 0 0;color:#9ca3af;font-size:11px;">${t.subtitle}</p>
        </td></tr>
        <!-- Badge certificado -->
        <tr><td align="center" style="padding:0 0 24px;">
          <div style="display:inline-block;width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);text-align:center;line-height:72px;font-size:36px;">✅</div>
        </td></tr>
        <!-- Card principal -->
        <tr><td style="background-color:#1a0a2e;border-radius:16px;padding:40px 36px;">
          <h1 style="margin:0 0 12px;color:#f3f4f6;font-size:22px;font-weight:700;text-align:center;">${t.heading}</h1>
          <p style="margin:0 0 28px;color:#d1d5db;font-size:15px;line-height:1.7;text-align:center;">${t.intro}</p>
          <!-- CTA certificado -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td align="center">
              <a href="${checkerLink}" style="display:inline-block;padding:13px 32px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">${t.certLabel}</a>
            </td></tr>
          </table>
          <!-- Qué significa -->
          <p style="margin:0 0 12px;color:#e5e7eb;font-size:14px;font-weight:600;">${t.whatMeans}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
            <tr><td width="20" valign="top" style="color:#10b981;font-size:14px;padding-right:8px;">✓</td><td style="color:#9ca3af;font-size:13px;line-height:1.6;padding-bottom:6px;">${t.point1}</td></tr>
            <tr><td width="20" valign="top" style="color:#10b981;font-size:14px;padding-right:8px;">✓</td><td style="color:#9ca3af;font-size:13px;line-height:1.6;padding-bottom:6px;">${t.point2}</td></tr>
            <tr><td width="20" valign="top" style="color:#10b981;font-size:14px;padding-right:8px;">✓</td><td style="color:#9ca3af;font-size:13px;line-height:1.6;">${t.point3}</td></tr>
          </table>
          <!-- Upsell o link registrar más -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${upsellBlock}
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:28px 20px 0;text-align:center;">
          <p style="margin:0;color:#6b7280;font-size:11px;line-height:1.6;">${t.footer}<br/>
            <a href="https://musicdibs.com" style="color:#9ca3af;text-decoration:none;">musicdibs.com</a> ·
            <a href="${dashboardUrl}" style="color:#9ca3af;text-decoration:none;">${t.panel}</a> ·
            <a href="https://musicdibs.com/contact" style="color:#9ca3af;text-decoration:none;">${t.support}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const messageId = crypto.randomUUID();

    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: "certification_email",
      recipient_email: email,
      status: "pending",
    });

    const { error: enqueueError } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        idempotency_key: `cert-${workId}-${messageId}`,
        message_id: messageId,
        to: email,
        from: "MusicDibs <noreply@notify.musicdibs.com>",
        sender_domain: "notify.musicdibs.com",
        subject: t.subject,
        html,
        text: t.textBody,
        purpose: "transactional",
        label: "certification_email",
        queued_at: new Date().toISOString(),
      },
    });

    if (enqueueError) {
      console.error("[CERT-EMAIL] Enqueue error:", enqueueError);
      return new Response(JSON.stringify({ error: "Failed to enqueue email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[CERT-EMAIL] Enqueued for ${email}, work: ${workId}, upsell: ${showUpsell}`);
    return new Response(JSON.stringify({ success: true, messageId, upsell: showUpsell }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[CERT-EMAIL] Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
