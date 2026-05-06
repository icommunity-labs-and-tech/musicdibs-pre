import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";
import { kycInProcessEmail } from "../_shared/transactional-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_REMINDERS = 3;
const MIN_DAYS_BETWEEN = 5;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    let callerUserId = "";

    try {
      const gc = (supabaseUser.auth as any).getClaims;
      if (typeof gc === "function") {
        const { data: claimsData } = await gc.call(supabaseUser.auth, token);
        if (claimsData?.claims?.sub) callerUserId = claimsData.claims.sub;
      }
    } catch (_) { /* */ }

    if (!callerUserId) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        if (payload?.sub) callerUserId = payload.sub;
      } catch (_) { /* */ }
    }

    if (!callerUserId) {
      const { data: { user }, error } = await supabaseUser.auth.getUser(token);
      if (error || !user) return json({ error: "Unauthorized" }, 401);
      callerUserId = user.id;
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUserId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleRow?.role !== "admin") return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const userId = body?.user_id as string | undefined;
    if (!userId) return json({ ok: false, reason: "user_id requerido" }, 400);

    // Profile + email
    const { data: profile } = await admin
      .from("profiles")
      .select("display_name, language, kyc_status")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile) return json({ ok: false, reason: "Usuario no encontrado" }, 404);
    if (profile.kyc_status === "verified") {
      return json({ ok: false, reason: "El usuario ya tiene KYC verificado" });
    }

    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    const userEmail = authUser?.user?.email;
    if (!userEmail) return json({ ok: false, reason: "Email no encontrado" }, 404);

    // Check reminder log
    const { data: logs } = await admin
      .from("kyc_reminder_log")
      .select("reminder_number, sent_at")
      .eq("user_id", userId)
      .order("sent_at", { ascending: false });

    const sentCount = logs?.length || 0;
    if (sentCount >= MAX_REMINDERS) {
      return json({ ok: false, reason: `Máximo de ${MAX_REMINDERS} recordatorios alcanzado` });
    }

    if (logs && logs.length > 0) {
      const last = new Date(logs[0].sent_at as string).getTime();
      const days = (Date.now() - last) / (1000 * 60 * 60 * 24);
      if (days < MIN_DAYS_BETWEEN) {
        const remaining = Math.ceil(MIN_DAYS_BETWEEN - days);
        return json({ ok: false, reason: `Último recordatorio hace ${days.toFixed(1)} días. Espera ${remaining} día(s) más.` });
      }
    }

    const reminderNumber = sentCount + 1;
    const lang = (profile.language as string) || "es";
    const displayName = (profile.display_name as string) || userEmail.split("@")[0];

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) return json({ ok: false, reason: "RESEND_API_KEY no configurado" }, 500);

    const email = kycInProcessEmail({ name: displayName, lang });
    const subjectPrefix = lang === "en" ? `Reminder #${reminderNumber}` : lang === "pt" ? `Lembrete #${reminderNumber}` : `Recordatorio #${reminderNumber}`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MusicDibs <noreply@notify.musicdibs.com>",
        to: [userEmail],
        subject: `${subjectPrefix} — ${email.subject}`,
        html: email.html,
      }),
    });

    if (!resendRes.ok) {
      const errTxt = await resendRes.text();
      console.error("[KYC-REMINDER] Resend error:", errTxt);
      return json({ ok: false, reason: "Error al enviar email" }, 500);
    }

    await admin.from("kyc_reminder_log").insert({
      user_id: userId,
      reminder_number: reminderNumber,
      type: "manual_admin",
      sent_at: new Date().toISOString(),
    });

    return json({ ok: true, reminder_number: reminderNumber });
  } catch (e: any) {
    console.error("[KYC-REMINDER] Error:", e);
    return json({ error: e?.message || "Internal error" }, 500);
  }
});
