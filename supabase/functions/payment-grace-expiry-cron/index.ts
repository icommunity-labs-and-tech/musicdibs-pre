import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const BATCH_SIZE = 50;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeLocale(lang: string | null): "es" | "en" | "pt" {
  if (!lang) return "es";
  const l = lang.toLowerCase();
  if (l.startsWith("pt") || l === "br") return "pt";
  if (l.startsWith("en")) return "en";
  return "es";
}

interface CancellationEmailContent {
  subject: string;
  html: string;
  text: string;
}

function buildCancellationEmail(
  locale: "es" | "en" | "pt",
  displayName: string
): CancellationEmailContent {
  const name = displayName || "artista";

  const content: Record<"es" | "en" | "pt", CancellationEmailContent> = {
    es: {
      subject: "Tu suscripción de MusicDibs ha sido cancelada",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
          <img src="https://musicdibs.com/logo.png" alt="MusicDibs" style="height: 40px; margin-bottom: 24px;" />
          <h2 style="color: #111; margin-bottom: 8px;">Hola, ${name}</h2>
          <p>Lamentablemente, tu suscripción de MusicDibs ha sido <strong>cancelada</strong> porque no se pudo procesar el pago en el plazo establecido.</p>
          <p>Tu cuenta ha pasado al plan gratuito. Tus obras registradas en blockchain siguen siendo tuyas y permanecen certificadas.</p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <strong>¿Quieres reactivar tu suscripción?</strong><br/>
            Puedes volver a suscribirte en cualquier momento desde tu panel de control.
          </div>
          <a href="https://musicdibs.com/dashboard/billing" style="display: inline-block; background: #7c3aed; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 0;">
            Reactivar suscripción
          </a>
          <p style="margin-top: 24px; color: #666; font-size: 14px;">
            Si tienes alguna pregunta, contáctanos en 
            <a href="mailto:support@musicdibs.com">support@musicdibs.com</a>.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">MusicDibs — Protege tu música con blockchain</p>
        </div>
      `,
      text: `Hola ${name},\n\nTu suscripción de MusicDibs ha sido cancelada porque no se pudo procesar el pago en el plazo establecido.\n\nTu cuenta ha pasado al plan gratuito. Tus obras registradas siguen siendo tuyas.\n\nPuedes reactivar tu suscripción en cualquier momento:\nhttps://musicdibs.com/dashboard/billing\n\nEl equipo de MusicDibs`,
    },
    en: {
      subject: "Your MusicDibs subscription has been cancelled",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
          <img src="https://musicdibs.com/logo.png" alt="MusicDibs" style="height: 40px; margin-bottom: 24px;" />
          <h2 style="color: #111; margin-bottom: 8px;">Hi, ${name}</h2>
          <p>Unfortunately, your MusicDibs subscription has been <strong>cancelled</strong> because we were unable to process your payment within the grace period.</p>
          <p>Your account has been moved to the free plan. Your blockchain-registered works remain certified and are still yours.</p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <strong>Want to reactivate your subscription?</strong><br/>
            You can subscribe again at any time from your dashboard.
          </div>
          <a href="https://musicdibs.com/dashboard/billing" style="display: inline-block; background: #7c3aed; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 0;">
            Reactivate subscription
          </a>
          <p style="margin-top: 24px; color: #666; font-size: 14px;">
            If you have any questions, contact us at 
            <a href="mailto:support@musicdibs.com">support@musicdibs.com</a>.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">MusicDibs — Protect your music with blockchain</p>
        </div>
      `,
      text: `Hi ${name},\n\nYour MusicDibs subscription has been cancelled because we were unable to process your payment within the grace period.\n\nYour account has been moved to the free plan. Your registered works remain certified and are still yours.\n\nYou can reactivate your subscription at any time:\nhttps://musicdibs.com/dashboard/billing\n\nThe MusicDibs Team`,
    },
    pt: {
      subject: "Sua assinatura do MusicDibs foi cancelada",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
          <img src="https://musicdibs.com/logo.png" alt="MusicDibs" style="height: 40px; margin-bottom: 24px;" />
          <h2 style="color: #111; margin-bottom: 8px;">Olá, ${name}</h2>
          <p>Infelizmente, sua assinatura do MusicDibs foi <strong>cancelada</strong> porque não foi possível processar o pagamento dentro do prazo estabelecido.</p>
          <p>Sua conta foi movida para o plano gratuito. Suas obras registradas na blockchain continuam certificadas e são suas.</p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <strong>Quer reativar sua assinatura?</strong><br/>
            Você pode assinar novamente a qualquer momento pelo seu painel.
          </div>
          <a href="https://musicdibs.com/dashboard/billing" style="display: inline-block; background: #7c3aed; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 0;">
            Reativar assinatura
          </a>
          <p style="margin-top: 24px; color: #666; font-size: 14px;">
            Se tiver alguma dúvida, entre em contato pelo 
            <a href="mailto:support@musicdibs.com">support@musicdibs.com</a>.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">MusicDibs — Proteja sua música com blockchain</p>
        </div>
      `,
      text: `Olá ${name},\n\nSua assinatura do MusicDibs foi cancelada porque não foi possível processar o pagamento dentro do prazo.\n\nSua conta foi movida para o plano gratuito. Suas obras registradas continuam certificadas e são suas.\n\nVocê pode reativar sua assinatura a qualquer momento:\nhttps://musicdibs.com/dashboard/billing\n\nEquipe MusicDibs`,
    },
  };

  return content[locale];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth: cron secret o service role key
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const authHeader = req.headers.get("Authorization") || "";
  const cronHeader = req.headers.get("x-cron-secret") || "";

  const isAuth =
    authHeader === `Bearer ${serviceKey}` ||
    (cronSecret.length > 0 && cronHeader === cronSecret);

  if (!isAuth) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;

  const supabase = createClient(supabaseUrl, serviceKey);
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  const now = new Date().toISOString();

  console.log(`[PAYMENT-GRACE-EXPIRY] Starting run at ${now}`);

  // Obtener usuarios con grace period expirado y aún con plan de pago
  const { data: expiredUsers, error: fetchErr } = await supabase
    .from("profiles")
    .select("user_id, display_name, language, subscription_plan, available_credits, stripe_customer_id, payment_issue_count")
    .lt("payment_grace_expires_at", now)
    .not("payment_grace_expires_at", "is", null)
    .not("subscription_plan", "in", '("Free","free")')
    .limit(BATCH_SIZE);

  if (fetchErr) {
    console.error("[PAYMENT-GRACE-EXPIRY] Failed to fetch expired users:", fetchErr);
    return json({ error: fetchErr.message }, 500);
  }

  if (!expiredUsers || expiredUsers.length === 0) {
    console.log("[PAYMENT-GRACE-EXPIRY] No expired grace periods found.");
    return json({ processed: 0, cancelled: 0 });
  }

  console.log(`[PAYMENT-GRACE-EXPIRY] Found ${expiredUsers.length} users with expired grace period`);

  const results = [];

  for (const profile of expiredUsers) {
    const userId = profile.user_id;
    const actions: string[] = [];

    try {
      // Leer email
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      const email = authUser?.user?.email;
      if (!email) {
        console.warn(`[PAYMENT-GRACE-EXPIRY] No email for user ${userId} — skipping`);
        continue;
      }

      console.log(`[PAYMENT-GRACE-EXPIRY] Cancelling ${email} (${userId})`);

      // 1. Plan a Free y créditos a 0
      await supabase.from("profiles").update({
        subscription_plan: "Free",
        available_credits: 0,
        payment_grace_expires_at: null, // limpiar para no reprocesar
        updated_at: now,
      }).eq("user_id", userId);
      actions.push("plan→Free, credits→0, grace_cleared");

      // 2. Cancelar suscripción en DB
      await supabase.from("subscriptions").update({
        status: "cancelled",
        updated_at: now,
      }).eq("user_id", userId).in("status", ["active", "past_due"]);
      actions.push("subscriptions→cancelled");

      // 3. Registrar en credit_transactions
      await supabase.from("credit_transactions").insert({
        user_id: userId,
        amount: 0,
        type: "admin_adjustment",
        description: `Cancelación automática por grace period expirado (${profile.payment_issue_count} notificaciones previas). Plan: ${profile.subscription_plan} → Free. Créditos: ${profile.available_credits} → 0`,
      });
      actions.push("credit_transaction registrado");

      // 4. Cancelar en Stripe si tiene customer_id
      if (profile.stripe_customer_id) {
        try {
          const activeSubs = await stripe.subscriptions.list({
            customer: profile.stripe_customer_id,
            status: "active",
            limit: 5,
          });
          for (const sub of activeSubs.data) {
            await stripe.subscriptions.cancel(sub.id);
            actions.push(`Stripe active sub ${sub.id} cancelada`);
          }

          const pastDueSubs = await stripe.subscriptions.list({
            customer: profile.stripe_customer_id,
            status: "past_due",
            limit: 5,
          });
          for (const sub of pastDueSubs.data) {
            await stripe.subscriptions.cancel(sub.id);
            actions.push(`Stripe past_due sub ${sub.id} cancelada`);
          }

          if (activeSubs.data.length === 0 && pastDueSubs.data.length === 0) {
            actions.push("Sin suscripciones activas en Stripe");
          }
        } catch (stripeErr: any) {
          console.warn(`[PAYMENT-GRACE-EXPIRY] Stripe warning for ${email}:`, stripeErr.message);
          actions.push(`Stripe warning: ${stripeErr.message?.slice(0, 100)}`);
        }
      } else {
        actions.push("Sin stripe_customer_id — Stripe no tocado");
      }

      // 5. Sync MailerLite
      try {
        await fetch(`${supabaseUrl}/functions/v1/mailerlite-webhook-handler`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            event: "subscription.cancelled",
            email,
            locale: profile.language || "es",
            plan_type: profile.subscription_plan?.toLowerCase().includes("annual") ? "anuales" : "mensuales",
            cancellation_reason: "payment_grace_expired",
          }),
        });
        actions.push("MailerLite synced");
      } catch (mlErr) {
        console.warn(`[PAYMENT-GRACE-EXPIRY] MailerLite warning for ${email}:`, mlErr);
        actions.push("MailerLite sync warning (non-blocking)");
      }

      // 6. Email de confirmación de cancelación
      const locale = normalizeLocale(profile.language);
      const emailContent = buildCancellationEmail(locale, profile.display_name);
      const messageId = `payment-grace-cancelled-${userId}-${Date.now()}`;

      const { error: queueErr } = await supabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          idempotency_key: messageId,
          message_id: messageId,
          label: "payment_grace_cancellation",
          from: "MusicDibs <noreply@notify.musicdibs.com>",
          sender_domain: "notify.musicdibs.com",
          to: email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          purpose: "transactional",
          queued_at: now,
        },
      });

      if (queueErr) {
        console.warn(`[PAYMENT-GRACE-EXPIRY] Email queue warning for ${email}:`, queueErr);
        actions.push("Email queue warning (non-blocking)");
      } else {
        actions.push("Email cancelación encolado");
      }

      console.log(`[PAYMENT-GRACE-EXPIRY] ✅ Done for ${email}:`, actions.join(" | "));
      results.push({ user_id: userId, email, status: "cancelled", actions });

    } catch (err: any) {
      console.error(`[PAYMENT-GRACE-EXPIRY] ❌ Fatal error for user ${userId}:`, err.message);
      results.push({ user_id: userId, status: "error", error: err.message });
    }
  }

  const cancelled = results.filter(r => r.status === "cancelled").length;
  const errors = results.filter(r => r.status === "error").length;

  console.log(`[PAYMENT-GRACE-EXPIRY] Finished: ${cancelled} cancelled, ${errors} errors`);

  return json({
    processed: results.length,
    cancelled,
    errors,
    results,
  });
});
