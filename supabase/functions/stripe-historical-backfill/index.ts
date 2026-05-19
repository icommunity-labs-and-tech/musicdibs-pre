import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const PRE_MIGRATION_CUTOFF = 1746057600; // 2026-05-01 UTC

function inferProductType(amountGross: number): string {
  if (amountGross >= 90) return "topup";
  if (amountGross >= 30) return "annual";
  if (amountGross === 7) return "single";
  if (amountGross < 15) return "monthly";
  return "topup";
}

function inferProductCode(productType: string): string {
  switch (productType) {
    case "annual":
      return "annual_100";
    case "monthly":
      return "monthly";
    case "single":
      return "single";
    default:
      return "topup";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Auth: x-cron-secret or service role key
  const cronSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("authorization") ?? "";
  const expectedCronSecret = Deno.env.get("CRON_SECRET");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const isCronAuthed =
    expectedCronSecret && cronSecret === expectedCronSecret;
  const isServiceAuthed = authHeader === `Bearer ${serviceRoleKey}`;

  if (!isCronAuthed && !isServiceAuthed) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripeKey =
    Deno.env.get("STRIPE_SECRET_KEY") ?? Deno.env.get("STRIPE_LIVE_SECRET_KEY");
  if (!stripeKey) {
    return new Response(
      JSON.stringify({ error: "STRIPE_SECRET_KEY not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    serviceRoleKey,
  );

  try {
    // 1. Load state
    const { data: state, error: stateErr } = await supabase
      .from("stripe_backfill_state")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (stateErr) throw stateErr;
    if (!state) {
      return new Response(
        JSON.stringify({ error: "backfill_state row missing" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (state.completed) {
      return new Response(
        JSON.stringify({ ok: true, status: "completed", state }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Fetch Stripe page
    const listParams: Stripe.ChargeListParams = {
      limit: 50,
      created: { lte: PRE_MIGRATION_CUTOFF },
      expand: ["data.balance_transaction"],
    };
    if (state.last_charge_id) {
      listParams.starting_after = state.last_charge_id;
    }

    const page = await stripe.charges.list(listParams);

    let inserted = 0;
    let skipped = 0;
    let lastId: string | null = state.last_charge_id;

    for (const charge of page.data) {
      lastId = charge.id;

      if (charge.status !== "succeeded") {
        skipped++;
        continue;
      }

      const description = (charge.description ?? "").toLowerCase();
      if (description.includes("certyfile")) {
        skipped++;
        continue;
      }

      // Dedupe
      const { data: existing } = await supabase
        .from("orders")
        .select("id")
        .eq("stripe_charge_id", charge.id)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const amountGross = Math.round((charge.amount / 100) * 100) / 100;
      const amountNet = Math.round((amountGross / 1.21) * 100) / 100;

      let stripeFee = 0;
      const bt = charge.balance_transaction;
      if (bt && typeof bt === "object" && "fee" in bt) {
        stripeFee = Math.round((bt.fee / 100) * 100) / 100;
      }

      const productType = inferProductType(amountGross);
      const productCode = inferProductCode(productType);

      // Find user_id via stripe_customer_id (nullable)
      let userId: string | null = null;
      const customerId =
        typeof charge.customer === "string"
          ? charge.customer
          : charge.customer?.id ?? null;

      if (customerId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        userId = profile?.user_id ?? null;
      }

      const { error: insErr } = await supabase.from("orders").insert({
        user_id: userId,
        amount_gross: amountGross,
        amount_net: amountNet,
        stripe_fee: stripeFee,
        product_type: productType,
        product_code: productCode,
        order_status: "paid",
        stripe_charge_id: charge.id,
        stripe_customer_id: customerId,
        paid_at: new Date(charge.created * 1000).toISOString(),
        currency: charge.currency,
        backfill_source: "stripe_historical",
      });

      if (insErr) {
        console.error("[backfill] insert error", charge.id, insErr.message);
        skipped++;
        continue;
      }

      inserted++;
    }

    const completed = !page.has_more;

    const { error: updErr } = await supabase
      .from("stripe_backfill_state")
      .update({
        last_charge_id: lastId,
        charges_processed: (state.charges_processed ?? 0) + page.data.length,
        orders_inserted: (state.orders_inserted ?? 0) + inserted,
        orders_skipped: (state.orders_skipped ?? 0) + skipped,
        completed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (updErr) throw updErr;

    return new Response(
      JSON.stringify({
        ok: true,
        processed: page.data.length,
        inserted,
        skipped,
        last_charge_id: lastId,
        has_more: page.has_more,
        completed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[stripe-historical-backfill] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
