import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { kycReminderEmail } from "../_shared/transactional-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const MAX_REMINDERS = 3;
const DAYS_BETWEEN = 5;
const FROM_EMAIL = "MusicDibs <noreply@notify.musicdibs.com>";

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

type ReminderTarget = {
  user_id: string;
  email?: string | null;
  name?: string | null;
  language?: string | null;
  kyc_status?: string | null;
  reminder_count?: number | null;
  last_reminder_at?: string | null;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getBodyTargets(body: Record<string, unknown>): ReminderTarget[] | null {
  if (!Array.isArray(body.users)) return null;
  return body.users
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const item = raw as Record<string, unknown>;
      const userId = asString(item.user_id);
      if (!userId) return null;
      return {
        user_id: userId,
        email: asString(item.email),
        name: asString(item.name) || asString(item.display_name),
        language: asString(item.language),
        kyc_status: asString(item.kyc_status),
        reminder_count: asNumber(item.reminder_count) ?? asNumber(item.kyc_reminders_count),
        last_reminder_at: asString(item.last_reminder_at) || asString(item.kyc_last_reminder_at),
      };
    })
    .filter((target): target is ReminderTarget => target !== null);
}

async function getReminderTarget(
  supabaseAdmin: ReturnType<typeof createClient>,
  target: ReminderTarget,
): Promise<ReminderTarget & { skipReason?: string }> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("user_id, language, kyc_status, full_name, display_name")
    .eq("user_id", target.user_id)
    .maybeSingle();

  if (!profile && !target.email) {
    return { ...target, skipReason: "User not found" };
  }

  let authEmail: string | null = null;
  let authName: string | null = null;
  try {
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(target.user_id);
    if (authError) console.warn(`[KYC-REMINDER] auth user lookup skipped for ${target.user_id}: ${authError.message}`);
    authEmail = authUser?.user?.email ?? null;
    authName = asString(authUser?.user?.user_metadata?.full_name) || asString(authUser?.user?.user_metadata?.display_name);
  } catch (e) {
    console.warn(`[KYC-REMINDER] auth user lookup exception for ${target.user_id}:`, e);
  }

  return {
    user_id: target.user_id,
    email: authEmail || target.email,
    name: asString((profile as Record<string, unknown> | null)?.full_name) ||
      asString((profile as Record<string, unknown> | null)?.display_name) ||
      target.name ||
      authName,
    language: asString((profile as Record<string, unknown> | null)?.language) || target.language,
    kyc_status: asString((profile as Record<string, unknown> | null)?.kyc_status) || target.kyc_status,
    reminder_count: target.reminder_count,
    last_reminder_at: target.last_reminder_at,
  };
}

async function getReminderStats(
  supabaseAdmin: ReturnType<typeof createClient>,
  target: ReminderTarget,
) {
  const [lastLogResult, countResult] = await Promise.all([
    supabaseAdmin
      .from("kyc_reminder_log")
      .select("sent_at")
      .eq("user_id", target.user_id)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("kyc_reminder_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", target.user_id),
  ]);

  return {
    lastSentAt: lastLogResult.data?.sent_at || target.last_reminder_at || null,
    count: countResult.count ?? target.reminder_count ?? 0,
  };
}

async function sendManualReminder(
  supabaseAdmin: ReturnType<typeof createClient>,
  target: ReminderTarget,
  type: "manual" | "auto" = "manual",
) {
  const resolved = await getReminderTarget(supabaseAdmin, target);
  if (resolved.skipReason) return { ok: false, reason: resolved.skipReason, user_id: target.user_id };
  if (resolved.kyc_status === "verified") return { ok: false, reason: "User already verified", user_id: target.user_id };
  if (!resolved.email) return { ok: false, reason: "No email on auth user", user_id: target.user_id };

  const { lastSentAt, count } = await getReminderStats(supabaseAdmin, resolved);
  if (lastSentAt) {
    const daysSince = (Date.now() - new Date(lastSentAt).getTime()) / 86400000;
    if (daysSince < DAYS_BETWEEN) {
      return { ok: false, reason: `Last reminder ${Math.floor(daysSince)}d ago`, user_id: target.user_id };
    }
  }

  const reminderNumber = count + 1;
  if (reminderNumber > MAX_REMINDERS) {
    return { ok: false, reason: `Max ${MAX_REMINDERS} reminders sent`, user_id: target.user_id };
  }

  const locale = normalizeLocale(resolved.language || null);
  const name = resolved.name || resolved.email.split("@")[0];
  const sent = await enqueueReminder(supabaseAdmin, resolved.email, name, locale, reminderNumber);
  if (!sent) return { ok: false, reason: "Email send failed", user_id: target.user_id };

  const { error: reminderLogError } = await supabaseAdmin
    .from("kyc_reminder_log")
    .insert({ user_id: target.user_id, reminder_number: reminderNumber, type });
  if (reminderLogError) {
    console.error(`[KYC-REMINDER] reminder log insert failed for ${target.user_id}: ${reminderLogError.message}`);
    return { ok: false, reason: "Reminder log failed", user_id: target.user_id };
  }

  return { ok: true, email: resolved.email, reminder_number: reminderNumber, lang: locale, user_id: target.user_id };
}

async function enqueueReminder(
  supabaseAdmin: ReturnType<typeof createClient>,
  email: string,
  name: string,
  lang: string,
  reminderNumber: number,
): Promise<boolean> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("[KYC-REMINDER] RESEND_API_KEY is not configured");
    return false;
  }

  let messageId = crypto.randomUUID();
  let label = `kyc_reminder_${reminderNumber}`;

  try {
    const emailData = kycReminderEmail({ name, lang, reminderNumber });
    const { error: logError } = await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: label,
      recipient_email: email,
      status: "pending",
    });
    if (logError) {
      console.error(`[KYC-REMINDER] email_send_log insert failed for ${email}: ${logError.message}`);
      return false;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        tags: [
          { name: "template", value: label },
          { name: "source", value: "kyc-reminder" },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[KYC-REMINDER] Resend send failed for ${email}: ${res.status} ${errText}`);
      await supabaseAdmin.from("email_send_log").insert({
        message_id: messageId,
        template_name: label,
        recipient_email: email,
        status: "failed",
        error_message: `Resend ${res.status}: ${errText}`.slice(0, 1000),
      });
      return false;
    }

    const resendResponse = await res.json().catch(() => ({}));
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: label,
      recipient_email: email,
      status: "sent",
      metadata: { resend_id: resendResponse?.id ?? null },
    });
    console.log(`[KYC-REMINDER] Sent ${label} to ${email} via Resend (msg ${messageId})`);
    return true;
  } catch (e) {
    console.error(`[KYC-REMINDER] enqueue exception for ${email}:`, e);
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: label,
      recipient_email: email,
      status: "failed",
      error_message: e instanceof Error ? e.message.slice(0, 1000) : String(e).slice(0, 1000),
    });
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: Record<string, unknown> = {};
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

  const manualUserId = asString(body.user_id);
  const batchSize = Math.min(asNumber(body.batch_size) || 200, 2000);
  const cutoffDate = new Date(Date.now() - DAYS_BETWEEN * 24 * 60 * 60 * 1000).toISOString();

  // MODO MANUAL MASIVO: admin envía recordatorio a usuarios seleccionados con datos ya cargados en la tabla.
  const manualTargets = getBodyTargets(body);
  if (manualTargets) {
    let sent = 0, skipped = 0, failed = 0;
    const reasons: Record<string, number> = {};
    const results = [];

    for (const target of manualTargets) {
      const result = await sendManualReminder(supabase, target, "manual");
      results.push(result);
      if (result.ok) sent++;
      else if (result.reason === "Email send failed" || result.reason === "Reminder log failed") failed++;
      else skipped++;
      if (!result.ok && result.reason) reasons[result.reason] = (reasons[result.reason] || 0) + 1;
    }

    return json({ ok: sent > 0, processed: manualTargets.length, sent, skipped, failed, reasons, results });
  }

  // MODO MANUAL: admin envía recordatorio a usuario concreto
  if (manualUserId) {
    const result = await sendManualReminder(supabase, {
      user_id: manualUserId,
      email: asString(body.email),
      name: asString(body.name),
      language: asString(body.language),
      kyc_status: asString(body.kyc_status),
      reminder_count: asNumber(body.reminder_count),
      last_reminder_at: asString(body.last_reminder_at),
    }, "manual");
    return json(result, result.reason === "Email send failed" || result.reason === "Reminder log failed" ? 500 : 200);
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
      logs.push({ user_id: u.user_id, reminder_number: reminderNumber, type: "auto" });
      totalAdded++;
    } else { totalFailed++; }
  }

  if (logs.length > 0) {
    const { error: reminderLogError } = await supabase.from("kyc_reminder_log").insert(logs);
    if (reminderLogError) {
      console.error(`[KYC-REMINDER] bulk reminder log insert failed: ${reminderLogError.message}`);
      return json({ ok: false, error: reminderLogError.message, enqueued: totalAdded, failed: totalFailed }, 500);
    }
  }

  console.log(`[KYC-REMINDER] Done: ${totalAdded} enqueued, ${totalFailed} failed`);
  return json({ ok: true, processed: eligible.length, enqueued: totalAdded, failed: totalFailed });
});
