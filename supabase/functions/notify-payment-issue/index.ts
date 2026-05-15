import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GRACE_DAYS = 7;

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

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

function buildEmail(
  locale: "es" | "en" | "pt",
  displayName: string,
  graceExpiresAt: Date,
  billingUrl: string
): EmailContent {
  const name = displayName || "artista";
  const deadline = graceExpiresAt.toLocaleDateString(
    locale === "pt" ? "pt-BR" : locale === "en" ? "en-GB" : "es-ES",
    { day: "numeric", month: "long", year: "numeric" }
  );

  const content: Record<"es" | "en" | "pt", EmailContent> = {
    es: {
      subject: "⚠️ Acción requerida: actualiza tu método de pago en MusicDibs",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
          <img src="https://musicdibs.com/logo.png" alt="MusicDibs" style="height: 40px; margin-bottom: 24px;" />
          <h2 style="color: #111; margin-bottom: 8px;">Hola, ${name}</h2>
          <p>Hemos detectado un problema al procesar el pago de tu suscripción en MusicDibs.</p>
          <p>Para mantener tu cuenta activa y seguir protegiendo tus obras en blockchain, necesitas actualizar tu método de pago antes del <strong>${deadline}</strong>.</p>
          <div style="background: #fff3cd; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin: 24px 0;">
            <strong>⏰ Tienes hasta el ${deadline} para actualizar tu pago.</strong><br/>
            Si no se resuelve antes de esa fecha, tu suscripción quedará cancelada.
          </div>
          <a href="${billingUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 0;">
            Actualizar método de pago
          </a>
          <p style="margin-top: 24px; color: #666; font-size: 14px;">
            Si ya has actualizado tu pago o crees que esto es un error, ignora este mensaje o contáctanos en 
            <a href="mailto:support@musicdibs.com">support@musicdibs.com</a>.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">MusicDibs — Protege tu música con blockchain</p>
        </div>
      `,
      text: `Hola ${name},\n\nHemos detectado un problema al procesar el pago de tu suscripción en MusicDibs.\n\nPor favor, actualiza tu método de pago antes del ${deadline} para evitar la cancelación de tu cuenta:\n${billingUrl}\n\nSi ya actualizaste tu pago, ignora este mensaje.\n\nEl equipo de MusicDibs`,
    },
    en: {
      subject: "⚠️ Action required: update your payment method on MusicDibs",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
          <img src="https://musicdibs.com/logo.png" alt="MusicDibs" style="height: 40px; margin-bottom: 24px;" />
          <h2 style="color: #111; margin-bottom: 8px;">Hi, ${name}</h2>
          <p>We encountered an issue processing your MusicDibs subscription payment.</p>
          <p>To keep your account active and continue protecting your works on the blockchain, please update your payment method before <strong>${deadline}</strong>.</p>
          <div style="background: #fff3cd; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin: 24px 0;">
            <strong>⏰ You have until ${deadline} to update your payment.</strong><br/>
            If not resolved by then, your subscription will be cancelled.
          </div>
          <a href="${billingUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 0;">
            Update payment method
          </a>
          <p style="margin-top: 24px; color: #666; font-size: 14px;">
            If you've already updated your payment or think this is an error, please ignore this message or contact us at 
            <a href="mailto:support@musicdibs.com">support@musicdibs.com</a>.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">MusicDibs — Protect your music with blockchain</p>
        </div>
      `,
      text: `Hi ${name},\n\nWe encountered an issue processing your MusicDibs subscription payment.\n\nPlease update your payment method before ${deadline} to avoid account cancellation:\n${billingUrl}\n\nIf you've already updated your payment, please ignore this message.\n\nThe MusicDibs Team`,
    },
    pt: {
      subject: "⚠️ Ação necessária: atualize seu método de pagamento no MusicDibs",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
          <img src="https://musicdibs.com/logo.png" alt="MusicDibs" style="height: 40px; margin-bottom: 24px;" />
          <h2 style="color: #111; margin-bottom: 8px;">Olá, ${name}</h2>
          <p>Identificamos um problema ao processar o pagamento da sua assinatura no MusicDibs.</p>
          <p>Para manter sua conta ativa e continuar protegendo suas obras na blockchain, por favor atualize seu método de pagamento antes de <strong>${deadline}</strong>.</p>
          <div style="background: #fff3cd; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin: 24px 0;">
            <strong>⏰ Você tem até ${deadline} para atualizar o pagamento.</strong><br/>
            Se não for resolvido até essa data, sua assinatura será cancelada.
          </div>
          <a href="${billingUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 0;">
            Atualizar método de pagamento
          </a>
          <p style="margin-top: 24px; color: #666; font-size: 14px;">
            Se você já atualizou o pagamento ou acredita que isso é um erro, ignore esta mensagem ou entre em contato pelo 
            <a href="mailto:support@musicdibs.com">support@musicdibs.com</a>.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">MusicDibs — Proteja sua música com blockchain</p>
        </div>
      `,
      text: `Olá ${name},\n\nIdentificamos um problema ao processar o pagamento da sua assinatura no MusicDibs.\n\nPor favor, atualize seu método de pagamento antes de ${deadline} para evitar o cancelamento da conta:\n${billingUrl}\n\nSe você já atualizou o pagamento, ignore esta mensagem.\n\nEquipe MusicDibs`,
    },
  };

  return content[locale];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization") || "";

  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Validar admin JWT
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) return json({ error: "Unauthorized" }, 401);

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleRow) return json({ error: "Forbidden — admin role required" }, 403);

  // Leer body
  let body: { user_id?: string } = {};
  try { body = await req.json(); } catch { /* no body */ }

  const targetUserId = body.user_id;
  if (!targetUserId) return json({ error: "user_id is required" }, 400);

  // Leer perfil del usuario objetivo
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("user_id, display_name, language, subscription_plan, payment_issue_count, payment_issue_notified_at, payment_grace_expires_at")
    .eq("user_id", targetUserId)
    .single();

  if (profileErr || !profile) return json({ error: "User not found" }, 404);

  // Leer email desde auth.users
  const { data: authUser } = await supabase.auth.admin.getUserById(targetUserId);
  const email = authUser?.user?.email;
  if (!email) return json({ error: "User has no email" }, 400);

  // Calcular grace period
  const now = new Date();
  const isFirstNotification = !profile.payment_grace_expires_at;
  const graceExpiresAt = isFirstNotification
    ? new Date(now.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000)
    : new Date(profile.payment_grace_expires_at);

  // Actualizar tracking en profiles
  const newCount = (profile.payment_issue_count || 0) + 1;
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({
      payment_issue_notified_at: now.toISOString(),
      payment_issue_count: newCount,
      payment_grace_expires_at: graceExpiresAt.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("user_id", targetUserId);

  if (updateErr) {
    console.error("[NOTIFY-PAYMENT-ISSUE] Failed to update profile:", updateErr);
    return json({ error: "Failed to update profile" }, 500);
  }

  // Construir email
  const locale = normalizeLocale(profile.language);
  const billingUrl = `https://musicdibs.com/dashboard/billing`;
  const emailContent = buildEmail(locale, profile.display_name, graceExpiresAt, billingUrl);
  const messageId = `payment-issue-${targetUserId}-${now.getTime()}`;

  // Encolar en transactional_emails (mismo patrón que el resto del sistema)
  const { error: queueErr } = await supabase.rpc("send_email", {
    queue_name: "transactional_emails",
    message: {
      message_id: messageId,
      label: "payment_issue_notification",
      from: "MusicDibs <noreply@musicdibs.com>",
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      queued_at: now.toISOString(),
    },
  });

  if (queueErr) {
    console.error("[NOTIFY-PAYMENT-ISSUE] Failed to queue email:", queueErr);
    return json({ error: "Failed to queue email" }, 500);
  }

  console.log(`[NOTIFY-PAYMENT-ISSUE] ✅ Notification queued for ${email} (attempt #${newCount}, grace until ${graceExpiresAt.toISOString()})`);

  return json({
    success: true,
    email,
    locale,
    notification_count: newCount,
    grace_expires_at: graceExpiresAt.toISOString(),
    is_first_notification: isFirstNotification,
  });
});
