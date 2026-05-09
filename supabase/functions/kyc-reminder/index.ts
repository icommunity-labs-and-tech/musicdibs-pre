import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const ML_API = "https://connect.mailerlite.com/api";
const KYC_GROUPS: Record<string, string> = {
  es: "186736686730839787",
  en: "186736699734230889",
  pt: "186736708193093233",
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

async function addToMailerLite(email: string, groupId: string, mlKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${ML_API}/subscribers`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${mlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, groups: [groupId], status: "active" }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn(`[KYC-REMINDER] ML add failed for ${email}: ${res.status} ${err.slice(0, 100)}`);
      return false;
    }
    return true;
  } catch (e) {
    console.warn(`[KYC-REMINDER] ML exception for ${email}:`, e);
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
  const mlKey = Deno.env.get("MAILERLITE_API_KEY");
  if (!mlKey) return json({ error: "MAILERLITE_API_KEY not set" }, 500);

  const manualUserId: string | null = body.user_id || null;
  const batchSize: number = Math.min(body.batch_size || 200, 2000);
  const cutoffDate = new Date(Date.now() - DAYS_BETWEEN * 24 * 60 * 60 * 1000).toISOString();

  // MODO MANUAL: admin envía recordatorio a usuario concreto
  if (manualUserId) {
    const { data: profile } = await supabase.from("profiles").select("user_id, language, kyc_status").eq("user_id", manualUserId).single();
    if (!profile) return json({ error: "User not found" }, 404);
    if (profile.kyc_status === "verified") return json({ ok: false, reason: "User already verified" });
    const { data: authUser } = await supabase.auth.admin.getUserById(manualUserId);
    const email = authUser?.user?.email;
    if (!email) return json({ error: "No email" }, 400);
    const { data: lastLog } = await supabase.from("kyc_reminder_log").select("sent_at").eq("user_id", manualUserId).order("sent_at", { ascending: false }).limit(1).maybeSingle();
    if (lastLog) {
      const daysSince = (Date.now() - new Date(lastLog.sent_at).getTime()) / 86400000;
      if (daysSince < DAYS_BETWEEN) return json({ ok: false, reason: `Last reminder ${Math.floor(daysSince)}d ago` });
    }
    const { count } = await supabase.from("kyc_reminder_log").select("id", { count: "exact", head: true }).eq("user_id", manualUserId);
    const reminderNumber = (count || 0) + 1;
    if (reminderNumber > MAX_REMINDERS) return json({ ok: false, reason: `Max ${MAX_REMINDERS} reminders sent` });
    const locale = normalizeLocale(profile.language);
    const groupId = KYC_GROUPS[locale];
    const added = await addToMailerLite(email, groupId, mlKey);
    if (added) await supabase.from("kyc_reminder_log").insert({ user_id: manualUserId, reminder_number: reminderNumber, type: "manual", mailerlite_group_id: groupId });
    return json({ ok: added, email, reminder_number: reminderNumber, group: locale });
  }

  // MODO CRON/MASIVO: usar RPC get_kyc_pending_users_with_email
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

  // Agrupar por idioma e importar en bloque a MailerLite
  const byLocale: Record<string, { email: string; user_id: string; reminder_count: number }[]> = { es: [], en: [], pt: [] };
  for (const u of eligible) {
    const locale = normalizeLocale(u.language);
    byLocale[locale].push(u);
  }

  let totalAdded = 0, totalFailed = 0;
  const logs: any[] = [];

  for (const [locale, users] of Object.entries(byLocale)) {
    if (users.length === 0) continue;
    const groupId = KYC_GROUPS[locale];
    for (const u of users) {
      const success = await addToMailerLite(u.email, groupId, mlKey);
      if (success) {
        logs.push({ user_id: u.user_id, reminder_number: (u.reminder_count || 0) + 1, type: "auto", mailerlite_group_id: groupId });
        totalAdded++;
      } else { totalFailed++; }
    }
  }

  if (logs.length > 0) await supabase.from("kyc_reminder_log").insert(logs);

  console.log(`[KYC-REMINDER] Done: ${totalAdded} added, ${totalFailed} failed`);
  return json({ ok: true, processed: eligible.length, added: totalAdded, failed: totalFailed });
});