// Daily incremental sync of Stripe charges → public.orders.
// Auth: x-cron-secret header OR service role bearer.
// Strategy: find MAX(paid_at) for non-historical orders, then fetch Stripe charges
// from that timestamp onward and insert any missing succeeded charges (excluding
// certyfile descriptions). Mirrors the insert shape of stripe-historical-backfill.

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function inferProductType(amountGross: number): string {
  if (amountGross >= 90) return "topup";
  if (amountGross >= 30) return "annual";
  if (amountGross === 7) return "single";
  if (amountGross < 15) return "monthly";
  return "topup";
}

function inferProductCode(productType: string): string {
  switch (productType) {
    case "annual": return "annual_100";
    case "monthly": return "monthly";
    case "single": return "single";
    default: return "topup";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const cronSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("authorization") ?? "";
  const expectedCronSecret = Deno.env.get("CRON_SECRET");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const isCronAuthed = expectedCronSecret && cronSecret === expectedCronSecret;
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
    return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

  try {
    // 1. Find most-recent non-historical paid_at
    const { data: lastRows, error: lastErr } = await supabase
      .from("orders")
      .select("paid_at, order_source")
      .or("order_source.is.null,order_source.neq.stripe_historical")
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: false })
      .limit(1);

    if (lastErr) throw lastErr;

    const lastPaidAt = lastRows?.[0]?.paid_at as string | undefined;
    const fromSec = lastPaidAt
      ? Math.floor(new Date(lastPaidAt).getTime() / 1000)
      : Math.floor(Date.now() / 1000) - 30 * 86400; // safety: last 30d if no rows
    const toSec = Math.floor(Date.now() / 1000);

    let inserted = 0;
    let skipped = 0;
    let processed = 0;
    let startingAfter: string | undefined;
    let hasMore = true;
    const MAX_PAGES = 50; // safety cap

    for (let page = 0; page < MAX_PAGES && hasMore; page++) {
      const params: Stripe.ChargeListParams = {
        limit: 100,
        expand: ["data.balance_transaction"],
        created: { gte: fromSec, lte: toSec },
      };
      if (startingAfter) params.starting_after = startingAfter;

      const batch = await stripe.charges.list(params);
      processed += batch.data.length;
      if (batch.data.length === 0) break;

      for (const charge of batch.data) {
        if (charge.status !== "succeeded") { skipped++; continue; }

        const description = (charge.description ?? "").toLowerCase();
        if (description.includes("certyfile")) { skipped++; continue; }

        const { data: existing } = await supabase
          .from("orders")
          .select("id")
          .eq("stripe_charge_id", charge.id)
          .maybeSingle();
        if (existing) { skipped++; continue; }

        const amountGross = Math.round((charge.amount / 100) * 100) / 100;
        const amountNet = Math.round((amountGross / 1.21) * 100) / 100;

        let stripeFee = 0;
        const bt = charge.balance_transaction;
        if (bt && typeof bt === "object" && "fee" in bt) {
          stripeFee = Math.round((bt.fee / 100) * 100) / 100;
        }

        const productType = inferProductType(amountGross);
        const productCode = inferProductCode(productType);

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
          order_source: "stripe_daily_sync",
          order_status: "paid",
          stripe_charge_id: charge.id,
          paid_at: new Date(charge.created * 1000).toISOString(),
          currency: charge.currency.toUpperCase(),
        });

        if (insErr) {
          console.error("[stripe-daily-sync] insert error", charge.id, insErr.message);
          skipped++;
          continue;
        }
        inserted++;
      }

      hasMore = batch.has_more;
      startingAfter = batch.data[batch.data.length - 1]?.id;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        processed,
        inserted,
        skipped,
        from_date: new Date(fromSec * 1000).toISOString(),
        to_date: new Date(toSec * 1000).toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[stripe-daily-sync] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
