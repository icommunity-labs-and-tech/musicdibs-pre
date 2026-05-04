import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// MailerLite groups: "Registrados (No compra)"
const ML_GROUPS_NO_PURCHASE: Record<"ES" | "EN" | "BR", string> = {
  ES: "180552557100270838",
  EN: "180552563766068699",
  BR: "180552569505974164",
};

function detectLang(input?: string): "ES" | "EN" | "BR" {
  const l = (input || "es").toLowerCase();
  if (l.startsWith("pt") || l === "br") return "BR";
  if (l.startsWith("en")) return "EN";
  return "ES";
}

function log(msg: string, data?: unknown) {
  console.log(`[GUEST-LEAD] ${msg}`, data ? JSON.stringify(data) : "");
}

async function addToMailerLite(email: string, lang: "ES" | "EN" | "BR") {
  const ML_KEY = Deno.env.get("MAILERLITE_API_KEY");
  if (!ML_KEY) {
    log("MAILERLITE_API_KEY not set, skipping ML");
    return false;
  }
  const groupId = ML_GROUPS_NO_PURCHASE[lang];
  try {
    const res = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ML_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, groups: [groupId], status: "active" }),
    });
    if (!res.ok) {
      const txt = await res.text();
      log(`ML error ${res.status}`, txt.slice(0, 300));
      return false;
    }
    return true;
  } catch (e) {
    log("ML exception", String(e));
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, language, attribution } = await req.json();

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const lang = detectLang(language);
    const langCode = lang === "BR" ? "pt" : lang === "EN" ? "en" : "es";

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    let userId: string | null = null;
    let isNewUser = false;

    // Try to create user (passwordless, email_confirm true)
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      email_confirm: true,
      user_metadata: {
        language: langCode,
        signup_source: "guest_checkout",
        attribution: attribution || {},
      },
    });

    if (created?.user) {
      userId = created.user.id;
      isNewUser = true;
      log(`Created user ${userId} (${normalizedEmail})`);
    } else if (createErr) {
      // Already registered → look it up
      log(`createUser error (likely existing): ${createErr.message}`);
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list?.users?.find(
        (u) => (u.email || "").toLowerCase() === normalizedEmail
      );
      if (existing) userId = existing.id;
    }

    // Send welcome email + add to MailerLite ONLY for newly created leads
    if (isNewUser && userId) {
      try {
        await supabaseAdmin.functions.invoke("send-welcome-email", {
          body: {
            userId,
            email: normalizedEmail,
            displayName: normalizedEmail.split("@")[0],
            language: langCode,
          },
        });
      } catch (e) {
        log("welcome email failed", String(e));
      }

      await addToMailerLite(normalizedEmail, lang);
    }

    return new Response(
      JSON.stringify({ ok: true, userId, isNewUser, email: normalizedEmail }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    log("unhandled", String(e));
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
