import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth: solo admins
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json(401, { error: "Unauthorized" });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return json(401, { error: "Unauthorized" });

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (roleRow?.role !== "admin") return json(403, { error: "Forbidden" });

    const body = await req.json();
    const targetUserId: string | undefined = body?.user_id;
    if (!targetUserId) return json(400, { error: "user_id requerido" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_plan, available_credits, stripe_customer_id, language")
      .eq("user_id", targetUserId)
      .single();

    if (!profile) return json(404, { error: "Usuario no encontrado" });

    const { data: authTarget } = await supabase.auth.admin.getUserById(targetUserId);
    const targetEmail = authTarget?.user?.email || "desconocido";

    console.log(`[ADMIN-CANCEL] Admin ${user.email} cancelling user ${targetEmail} (${targetUserId})`);

    const results: string[] = [];

    // 1. Plan a Free y créditos a 0
    await supabase.from("profiles").update({
      subscription_plan: "Free",
      available_credits: 0,
      updated_at: new Date().toISOString(),
    }).eq("user_id", targetUserId);
    results.push("plan→Free, creditos→0");

    // 2. Cancelar suscripción en Supabase
    await supabase.from("subscriptions").update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    }).eq("user_id", targetUserId).in("status", ["active", "past_due"]);
    results.push("subscriptions→cancelled");

    // 3. Registrar en credit_transactions
    await supabase.from("credit_transactions").insert({
      user_id: targetUserId,
      amount: 0,
      type: "admin_adjustment",
      description: `Baja manual por admin (${user.email}). Plan: ${profile.subscription_plan} → Free. Creditos: ${profile.available_credits} → 0`,
    });
    results.push("credit_transaction registrado");

    // 4. Cancelar suscripción activa en Stripe
    const customerId = profile.stripe_customer_id;
    if (customerId) {
      try {
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
          apiVersion: "2025-08-27.basil",
        });
        const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 5 });
        for (const sub of subs.data) {
          await stripe.subscriptions.cancel(sub.id);
          results.push(`Stripe sub ${sub.id} cancelada`);
        }
        const pastDueSubs = await stripe.subscriptions.list({ customer: customerId, status: "past_due", limit: 5 });
        for (const sub of pastDueSubs.data) {
          await stripe.subscriptions.cancel(sub.id);
          results.push(`Stripe sub past_due ${sub.id} cancelada`);
        }
        if (subs.data.length === 0 && pastDueSubs.data.length === 0) {
          results.push("No había suscripciones activas en Stripe");
        }
      } catch (stripeErr: any) {
        console.warn("[ADMIN-CANCEL] Stripe error (non-blocking):", stripeErr.message);
        results.push(`Stripe warning: ${stripeErr.message?.slice(0, 100)}`);
      }
    } else {
      results.push("Sin stripe_customer_id — Stripe no tocado");
    }

    // 5. Sync MailerLite
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/mailerlite-webhook-handler`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          event: "subscription.cancelled",
          email: targetEmail,
          locale: profile.language || "es",
          plan_type: profile.subscription_plan?.toLowerCase().includes("annual") ? "anuales" : "mensuales",
          cancellation_reason: "admin_manual",
        }),
      });
      results.push("MailerLite synced");
    } catch (mlErr) {
      console.warn("[ADMIN-CANCEL] MailerLite sync error (non-blocking):", mlErr);
    }

    console.log(`[ADMIN-CANCEL] Done for ${targetEmail}:`, results.join(" | "));

    return json(200, { ok: true, user_id: targetUserId, email: targetEmail, actions: results });

  } catch (err: any) {
    console.error("[ADMIN-CANCEL] Fatal error:", err);
    return json(500, { error: err?.message || "Internal error" });
  }
});
