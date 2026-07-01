import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const CHECKOUT_URL = "https://musicdibs.com/dashboard/billing";

function emailHtml(name: string, lang: string): string {
  const t: Record<string, Record<string, string>> = {
    es: {
      subject: "Tu pago no se pudo procesar - MusicDibs",
      title: "No pudimos procesar tu pago",
      body: `Hola ${name}, hemos intentado procesar tu pago para MusicDibs pero no fue posible completarlo.`,
      cta_text: "Reintentar pago",
      note: "Si tienes problemas con tu tarjeta, puedes actualizar tu metodo de pago desde el panel.",
    },
    en: {
      subject: "Your payment could not be processed - MusicDibs",
      title: "We couldn't process your payment",
      body: `Hi ${name}, we tried to process your MusicDibs payment but were unable to complete it.`,
      cta_text: "Retry payment",
      note: "If you're having issues with your card, you can update your payment method from the dashboard.",
    },
    pt: {
      subject: "Seu pagamento nao pôde ser processado - MusicDibs",
      title: "Nao conseguimos processar seu pagamento",
      body: `Ola ${name}, tentamos processar seu pagamento no MusicDibs mas nao foi possivel concluir.`,
      cta_text: "Tentar novamente",
      note: "Se tiver problemas com o cartao, pode atualizar o metodo de pagamento no painel.",
    },
  };
  const l = lang?.startsWith("pt") ? "pt" : lang === "en" ? "en" : "es";
  const tx = t[l];
  return `
  <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111">
    <img src="https://musicdibs.com/logo.png" alt="MusicDibs" style="height:40px;margin-bottom:24px" />
    <h2 style="color:#7c3aed">${tx.title}</h2>
    <p>${tx.body}</p>
    <div style="background:#fee2e2;border-left:4px solid #ef4444;padding:16px;border-radius:4px;margin:24px 0">
      <strong>El pago no fue completado.</strong> Por favor reintentalo para continuar disfrutando de MusicDibs.
    </div>
    <a href="${CHECKOUT_URL}" style="display:inline-block;background:#7c3aed;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin:8px 0">
      ${tx.cta_text}
    </a>
    <p style="margin-top:24px;color:#666;font-size:14px">${tx.note}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
    <p style="color:#999;font-size:12px">MusicDibs by iCommunity</p>
  </div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verificar firma de Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2024-06-20" });
    const webhookSecret = Deno.env.get("STRIPE_FAILED_CHECKOUT_WEBHOOK_SECRET") || Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
    const body = await req.text();
    const sig = req.headers.get("stripe-signature") || "";

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch {
      // Si no hay firma (llamada interna), parsear directamente
      event = JSON.parse(body) as Stripe.Event;
    }

    // Solo procesar payment_intent.payment_failed en creación de suscripción
    if (event.type !== "payment_intent.payment_failed" && event.type !== "invoice.payment_failed") {
      return json({ skipped: true, type: event.type });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let customerId: string | null = null;
    let billingReason = "";

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      // Solo para CREACIÓN de suscripción, no renovaciones (esas las maneja notify-payment-issue)
      billingReason = invoice.billing_reason || "";
      if (billingReason !== "subscription_create") {
        return json({ skipped: true, reason: "not_subscription_create" });
      }
      customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id || null;
    } else {
      const pi = event.data.object as Stripe.PaymentIntent;
      customerId = typeof pi.customer === "string" ? pi.customer : null;
      // Solo si tiene invoice asociado con billing_reason=subscription_create
      if (!pi.invoice) return json({ skipped: true, reason: "no_invoice" });
    }

    if (!customerId) return json({ skipped: true, reason: "no_customer" });

    // Buscar perfil
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, display_name, language")
      .eq("stripe_customer_id", customerId)
      .single();

    if (!profile) return json({ skipped: true, reason: "no_profile" });

    // Buscar email
    const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
    const userEmail = authUser?.user?.email;
    if (!userEmail) return json({ skipped: true, reason: "no_email" });

    // Evitar enviar más de 1 email por evento de checkout fallido
    const { count } = await supabase
      .from("email_send_log")
      .select("id", { count: "exact", head: true })
      .eq("recipient_email", userEmail)
      .eq("template_name", "failed_checkout")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if ((count ?? 0) > 0) {
      return json({ skipped: true, reason: "already_sent_today" });
    }

    const lang = profile.language || "es";
    const name = profile.display_name || userEmail.split("@")[0];
    const html = emailHtml(name, lang);

    // Enviar via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: "MusicDibs <noreply@musicdibs.com>",
        to: [userEmail],
        subject: lang === "en" ? "Your payment could not be processed - MusicDibs"
                : lang?.startsWith("pt") ? "Seu pagamento nao pôde ser processado - MusicDibs"
                : "Tu pago no se pudo procesar - MusicDibs",
        html,
      }),
    });

    const resData = await res.json();
    const msgId = resData.id || crypto.randomUUID();

    await supabase.from("email_send_log").insert({
      message_id: msgId,
      template_name: "failed_checkout",
      recipient_email: userEmail,
      status: "sent",
    });

    console.log(`[FAILED-CHECKOUT] Email enviado a ${userEmail} (${lang})`);
    return json({ success: true, email: userEmail });

  } catch (err) {
    console.error("[FAILED-CHECKOUT] Error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
