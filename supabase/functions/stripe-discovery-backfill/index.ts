import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const stripeKey = Deno.env.get("STRIPE_LIVE_SECRET_KEY") || Deno.env.get("STRIPE_SECRET_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

  const results = {
    profiles_scanned: 0,
    profiles_skipped_have_orders: 0,
    profiles_processed: 0,
    orders_created: 0,
    orders_skipped_duplicate: 0,
    errors: [] as string[],
    created: [] as any[],
  };

  // Fetch verified paid users (critical + medium segments)
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("user_id, display_name, stripe_customer_id, subscription_plan, subscription_tier")
    .not("stripe_customer_id", "is", null)
    .neq("stripe_customer_id", "")
    .eq("kyc_status", "verified")
    .in("subscription_plan", ["Annual", "Monthly"]);

  if (profilesError || !profiles) {
    return new Response(JSON.stringify({ error: profilesError?.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`[DISCOVERY] Found ${profiles.length} verified paid profiles to check`);

  for (const profile of profiles) {
    results.profiles_scanned++;

    // Skip if user already has at least one order
    const { count: existingCount } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.user_id);

    if ((existingCount ?? 0) > 0) {
      results.profiles_skipped_have_orders++;
      continue;
    }

    // Determine product_type from plan
    const productType =
      profile.subscription_plan === "Monthly" || (profile.subscription_tier ?? "").includes("monthly")
        ? "monthly"
        : "annual";

    // Fetch all charges for this customer from Stripe
    try {
      const charges = await stripe.charges.list({
        customer: profile.stripe_customer_id,
        limit: 100,
      });

      // Only process succeeded, non-refunded charges, sorted oldest first
      const validCharges = charges.data
        .filter((c) => c.status === "succeeded" && !c.refunded)
        .sort((a, b) => a.created - b.created);

      if (validCharges.length === 0) {
        console.log(`[DISCOVERY] No valid charges for ${profile.display_name} (${profile.stripe_customer_id})`);
        results.profiles_processed++;
        continue;
      }

      let ordersCreatedForUser = 0;

      for (let i = 0; i < validCharges.length; i++) {
        const charge = validCharges[i];

        // Idempotency: skip if charge already has an order
        const { count: chargeDup } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("stripe_charge_id", charge.id);

        if ((chargeDup ?? 0) > 0) {
          results.orders_skipped_duplicate++;
          continue;
        }

        const paidAt = new Date(charge.created * 1000).toISOString();
        const amountGross = charge.amount / 100;
        const currency = charge.currency ?? "eur";
        const isRenewal = i > 0; // first charge = initial purchase, rest = renewals

        const { error: insertError } = await supabase.from("orders").insert({
          user_id: profile.user_id,
          stripe_customer_id: profile.stripe_customer_id,
          stripe_charge_id: charge.id,
          amount_gross: amountGross,
          currency,
          paid_at: paidAt,
          order_source: "stripe_historical",
          product_type: productType,
          is_renewal: isRenewal,
        });

        if (insertError) {
          results.errors.push(
            `${profile.display_name} / ${charge.id}: ${insertError.message}`
          );
        } else {
          results.orders_created++;
          ordersCreatedForUser++;
          results.created.push({
            user: profile.display_name,
            customer_id: profile.stripe_customer_id,
            charge_id: charge.id,
            amount: amountGross,
            currency,
            paid_at: paidAt,
            is_renewal: isRenewal,
            product_type: productType,
          });
          console.log(
            `[DISCOVERY] Created order for ${profile.display_name}: ${charge.id} €${amountGross} paid_at=${paidAt}`
          );
        }
      }

      results.profiles_processed++;
      console.log(
        `[DISCOVERY] ${profile.display_name}: ${ordersCreatedForUser} orders created from ${validCharges.length} charges`
      );
    } catch (err: any) {
      results.errors.push(
        `${profile.display_name} (${profile.stripe_customer_id}): ${err.message}`
      );
      console.error(`[DISCOVERY] Error for ${profile.display_name}:`, err.message);
    }

    // Throttle to stay within Stripe rate limits
    await new Promise((r) => setTimeout(r, 60));
  }

  console.log(`[DISCOVERY] Done. ${results.orders_created} orders created, ${results.errors.length} errors`);

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
