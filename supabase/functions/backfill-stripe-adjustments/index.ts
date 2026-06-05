// Backfill public.stripe_adjustments from Stripe balance_transactions.
// Captures non-dispute adjustments (manual corrections, reserves, refunds
// adjustments, etc.) that are NOT covered by orders.stripe_fee or
// orders.dispute_fee, so admin metrics have full visibility into Stripe costs.
//
// We skip:
//   - type === 'charge' / 'payment' (already in orders.stripe_fee)
//   - type === 'refund' (already deducted via order_status='refunded')
//   - any balance_tx whose `source` is a Dispute (already in orders.dispute_fee)
//
// Auth: x-cron-secret header OR service-role bearer OR admin JWT.
//
// Body (all optional):
//   { from?: ISO date, to?: ISO date, limit?: number, dry_run?: boolean }

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const SKIP_TYPES = new Set(["charge", "payment", "refund", "payment_refund"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const cronSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("authorization") ?? "";
  const expectedCronSecret = Deno.env.get("CRON_SECRET");

  let authorized =
    (expectedCronSecret && cronSecret === expectedCronSecret) ||
    authHeader === `Bearer ${serviceKey}`;


  if (!authorized && authHeader.startsWith("Bearer ")) {
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await userClient.auth.getUser(token);
    if (user?.id) {
      const admin = createClient(supabaseUrl, serviceKey);
      const { data: roles } = await admin
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").limit(1);
      if (roles && roles.length) authorized = true;
    }
  }

  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
  const supabase = createClient(supabaseUrl, serviceKey);

  const body = await req.json().catch(() => ({} as any));
  const from = body.from as string | undefined;
  const to = body.to as string | undefined;
  const limit = Math.min(Math.max(Number(body.limit ?? 500), 1), 5000);
  const dryRun = !!body.dry_run;

  const created: Record<string, number> = {};
  if (from) created.gte = Math.floor(new Date(from).getTime() / 1000);
  if (to) created.lte = Math.floor(new Date(to).getTime() / 1000);

  let processed = 0, inserted = 0, skipped = 0, failed = 0;

  for await (const bt of stripe.balanceTransactions.list({
    limit: 100,
    ...(Object.keys(created).length ? { created } : {}),
  })) {
    if (processed >= limit) break;
    processed++;

    try {
      const type = String((bt as any).type || "");
      if (SKIP_TYPES.has(type)) { skipped++; continue; }

      const sourceId = typeof (bt as any).source === "string"
        ? (bt as any).source
        : (bt as any).source?.id ?? null;

      // Skip dispute-linked balance txs (tracked in orders.dispute_fee)
      if (sourceId && sourceId.startsWith("dp_")) { skipped++; continue; }

      // Skip if already inserted (idempotent)
      const { data: existing } = await supabase
        .from("stripe_adjustments")
        .select("id")
        .eq("balance_transaction_id", bt.id)
        .maybeSingle();
      if (existing?.id) { skipped++; continue; }

      // Try to link to an order via charge source
      let orderId: string | null = null;
      if (sourceId && sourceId.startsWith("ch_")) {
        const { data: ord } = await supabase
          .from("orders")
          .select("id")
          .eq("stripe_charge_id", sourceId)
          .maybeSingle();
        orderId = ord?.id ?? null;
      }

      if (!dryRun) {
        const { error: insErr } = await supabase.from("stripe_adjustments").insert({
          balance_transaction_id: bt.id,
          type,
          reporting_category: (bt as any).reporting_category ?? null,
          amount: ((bt.amount || 0) as number) / 100,
          fee: ((bt.fee || 0) as number) / 100,
          net: ((bt.net || 0) as number) / 100,
          currency: bt.currency,
          description: (bt as any).description ?? null,
          source_id: sourceId,
          source_type: sourceId ? sourceId.split("_")[0] : null,
          order_id: orderId,
          occurred_at: new Date(bt.created * 1000).toISOString(),
          raw: bt as any,
        });
        if (insErr) { failed++; continue; }
      }
      inserted++;
    } catch (err) {
      failed++;
      console.warn("[backfill-adjustments] failed", bt.id, (err as any)?.message);
    }
  }

  return new Response(JSON.stringify({
    ok: true, dry_run: dryRun, processed, inserted, skipped, failed,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
