import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    const user = userData.user;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if ((customer as Stripe.DeletedCustomer).deleted) {
          customerId = null;
        }
      } catch (stripeError: any) {
        if (stripeError?.code === "resource_missing" || stripeError?.statusCode === 404) {
          console.warn("[LIST-INVOICES] Stored Stripe customer no longer exists, falling back to email", {
            userId: user.id,
            customerId,
          });
          customerId = null;
          await supabaseAdmin.from("profiles").update({ stripe_customer_id: null }).eq("user_id", user.id);
        } else {
          throw stripeError;
        }
      }
    }

    // Fallback: search by email when the stored customer is missing or stale.
    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    let limit = 20;
    try {
      const body = await req.json();
      if (body.limit) limit = Math.min(body.limit, 100);
    } catch {
      // no body
    }

    if (!customerId) {
      return new Response(
        JSON.stringify({ invoices: [], has_more: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch invoices first
    const invoices = await stripe.invoices.list({ customer: customerId, limit });

    const invoiceChargeIds = new Set<string>();
    const invoicePIIds = new Set<string>();
    for (const inv of invoices.data as any[]) {
      if (inv.charge) invoiceChargeIds.add(typeof inv.charge === "string" ? inv.charge : inv.charge.id);
      if (inv.payment_intent) invoicePIIds.add(typeof inv.payment_intent === "string" ? inv.payment_intent : inv.payment_intent.id);
    }

    const mapped: any[] = invoices.data.map((inv: any) => ({
      id: inv.id,
      number: inv.number,
      status: inv.status,
      amount_due: inv.amount_due,
      amount_paid: inv.amount_paid,
      currency: inv.currency,
      created: inv.created,
      period_start: inv.period_start,
      period_end: inv.period_end,
      hosted_invoice_url: inv.hosted_invoice_url,
      invoice_pdf: inv.invoice_pdf,
      description: inv.description || inv.lines?.data?.[0]?.description || null,
      payment_type: inv.subscription ? "subscription" : "one_time",
    }));

    // Fallback: also list succeeded charges with no invoice attached
    // (legacy PaymentIntents without invoice_creation, or one-off charges).
    // Surface Stripe's hosted receipt_url so users still see proof of payment.
    const charges = await stripe.charges.list({ customer: customerId, limit });
    for (const ch of charges.data as any[]) {
      if (ch.status !== "succeeded") continue;
      if (ch.invoice) continue;
      if (invoiceChargeIds.has(ch.id)) continue;
      const pi = typeof ch.payment_intent === "string" ? ch.payment_intent : ch.payment_intent?.id;
      if (pi && invoicePIIds.has(pi)) continue;
      if ((ch.description ?? "").toLowerCase().includes("certyfile")) continue;

      mapped.push({
        id: ch.id,
        number: ch.receipt_number ?? null,
        status: "paid",
        amount_due: ch.amount,
        amount_paid: ch.amount,
        currency: ch.currency,
        created: ch.created,
        period_start: ch.created,
        period_end: ch.created,
        hosted_invoice_url: ch.receipt_url ?? null,
        invoice_pdf: null,
        description: ch.description ?? null,
        payment_type: "one_time",
      });
    }

    mapped.sort((a, b) => (b.created ?? 0) - (a.created ?? 0));

    console.log("[LIST-INVOICES] customer", customerId, "invoices:", invoices.data.length, "charges_added:", mapped.length - invoices.data.length);

    return new Response(
      JSON.stringify({ invoices: mapped, has_more: invoices.has_more || charges.has_more }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[LIST-INVOICES] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
