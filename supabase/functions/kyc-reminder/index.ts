import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { kycReminderEmail } from "../_shared/transactional-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const MAX_REMINDERS = 3;
const DAYS_BETWEEN = 5;

function normalizeLocale(lang: string | null): "es" | "en" | "pt" {
  if (!lang) return "es";
  const l = lang.toLowerCase();
  if (l.startsWith("pt") || l === "br") return "pt";
  if (l.startsWith("en")) return "en";
  return "es";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function enqueueReminder(
  supabaseAdmin: ReturnType<typeof createClient>,
  email: string,
  name: string,
  lang: string,
  reminderNumber: number,
): Promise<boolean> {
  try {
    const emailData = kycReminderEmail({ name, lang, reminderNumber });
    const messageId = crypto.randomUUID();
    const label = `kyc_reminder_${reminderNumber}`;
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: label,
      recipient_email: email,
      status: "pending",
    });
    const { error } = await supabaseAdmin.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        idempotency_key: `${label}-${messageId}`,
        message_id: messageId,
        to: email,
        from: "MusicDibs <noreply@notify.musicdibs.com>",
        sender_domain: "notify.musicdibs.com",
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        purpose: "transactional",
        label,
        queued_at: new Date().toISOString(),
      },
    });
    if (error) {
      console.warn(`[KYC-REMINDER] enqueue_email failed for ${email}: ${error.message}`);
      return false;
    }
    console.log(`[KYC-REMINDER] Enqueued ${label} to ${email} (msg ${messageId})`);
    return true;
  } catch (e) {
    console.warn(`[KYC-REMINDER] enqueue exception for ${email}:`, e);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: any = {};
  try { body = await req.json(); } catch { /* no body */ }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const authHeader = req.headers.get("Authorization") || "";
  const cronHeader = req.headers.get("x-cron-secret") || "";

  let isAuth = authHeader === `Bearer ${serviceKey}` || (cronSecret && cronHeader === cronSecret);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

  // Allow admin users via JWT (manual mode from admin UI)
  if (!isAuth && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (roleRow?.role === "admin") isAuth = true;
    }
  }

  if (!isAuth) return json({ error: "Unauthorized" }, 401);

  const manualUserId: string | null = body.user_id || null;
  const batchSize: number = Math.min(body.batch_size || 200, 2000);
  const cutoffDate = new Date(Date.now() - DAYS_BETWEEN * 24 * 60 * 60 * 1000).toISOString();

  // MODO MANUAL: admin envía recordatorio a usuario concreto
  if (manualUserId) {
    const { data: profile } = await supabase.from("profiles").select("user_id, language, kyc_status, full_name").eq("user_id", manualUserId).single();
    if (!profile) return json({ error: "User not found" }, 404);
    if (profile.kyc_status === "verified") return json({ ok: false, reason: "User already verified" });
    const { data: authUser } = await supabase.auth.admin.getUserById(manualUserId);
    const email = authUser?.user?.email;
    if (!email) return json({ ok: false, reason: "No email on auth user" });
    const name = (profile as any).full_name || authUser?.user?.user_metadata?.full_name || email.split("@")[0];
    const { data: lastLog } = await supabase.from("kyc_reminder_log").select("sent_at").eq("user_id", manualUserId).order("sent_at", { ascending: false }).limit(1).maybeSingle();
    if (lastLog) {
      const daysSince = (Date.now() - new Date(lastLog.sent_at).getTime()) / 86400000;
      if (daysSince < DAYS_BETWEEN) return json({ ok: false, reason: `Last reminder ${Math.floor(daysSince)}d ago` });
    }
    const { count } = await supabase.from("kyc_reminder_log").select("id", { count: "exact", head: true }).eq("user_id", manualUserId);
    const reminderNumber = (count || 0) + 1;
    if (reminderNumber > MAX_REMINDERS) return json({ ok: false, reason: `Max ${MAX_REMINDERS} reminders sent` });
    const locale = normalizeLocale(profile.language);
    const sent = await enqueueReminder(supabase, email, name, locale, reminderNumber);
    if (sent) await supabase.from("kyc_reminder_log").insert({ user_id: manualUserId, reminder_number: reminderNumber, type: "manual", channel: "resend" });
    return json({ ok: sent, email, reminder_number: reminderNumber, lang: locale });
  }

  // MODO CRON/MASIVO
  const { data: eligible, error: rpcErr } = await supabase.rpc("get_kyc_pending_users_with_email", {
    p_batch_size: batchSize,
    p_cutoff_date: cutoffDate,
    p_max_reminders: MAX_REMINDERS,
  });

  if (rpcErr) {
    console.error("[KYC-REMINDER] RPC error:", rpcErr.message);
    return json({ ok: false, error: rpcErr.message }, 500);
  }
  if (!eligible || eligible.length === 0) return json({ ok: true, processed: 0, reason: "No eligible users" });

  let totalAdded = 0, totalFailed = 0;
  const logs: any[] = [];

  for (const u of eligible as any[]) {
    const locale = normalizeLocale(u.language);
    const reminderNumber = (u.reminder_count || 0) + 1;
    const name = u.full_name || (u.email ? u.email.split("@")[0] : "");
    const success = await enqueueReminder(supabase, u.email, name, locale, reminderNumber);
    if (success) {
      logs.push({ user_id: u.user_id, reminder_number: reminderNumber, type: "auto", channel: "resend" });
      totalAdded++;
    } else { totalFailed++; }
  }

  if (logs.length > 0) await supabase.from("kyc_reminder_log").insert(logs);

  console.log(`[KYC-REMINDER] Done: ${totalAdded} enqueued, ${totalFailed} failed`);
  return json({ ok: true, processed: eligible.length, enqueued: totalAdded, failed: totalFailed });
});
