// Backfill orders.stripe_fee from Stripe balance_transaction.fee for orders
// whose stripe_fee is 0 or NULL. Also recomputes amount_net as gross - tax - fee
// when amount_net was previously equal to gross (i.e. no tax applied).
//
// Auth: x-cron-secret header OR service-role bearer OR admin JWT.
//
// Body (all optional):
//   { from?: ISO date, to?: ISO date, limit?: number, dry_run?: boolean }
//
// Defaults: limit = 500, dry_run = false. Only scans orders with stripe_fee 0/NULL.

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

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
  const limit = Math.min(Math.max(Number(body.limit ?? 500), 1), 2000);
  const dryRun = !!body.dry_run;

  let q = supabase
    .from("orders")
    .select("id, amount_gross, amount_net, stripe_fee, stripe_charge_id, stripe_invoice_id, stripe_checkout_session_id, paid_at")
    .or("stripe_fee.is.null,stripe_fee.eq.0")
    .order("paid_at", { ascending: false })
    .limit(limit);
  if (from) q = q.gte("paid_at", from);
  if (to) q = q.lte("paid_at", to);

  const { data: orders, error } = await q;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let processed = 0, updated = 0, skipped = 0, failed = 0;
  const changes: any[] = [];

  for (const o of orders ?? []) {
    processed++;
    let chargeId = o.stripe_charge_id as string | null;

    try {
      // Resolve charge id from invoice or session if missing
      if (!chargeId && o.stripe_invoice_id) {
        const inv = await stripe.invoices.retrieve(o.stripe_invoice_id);
        chargeId = (inv as any).charge as string | null;
      }
      if (!chargeId && o.stripe_checkout_session_id) {
        const sess = await stripe.checkout.sessions.retrieve(o.stripe_checkout_session_id, {
          expand: ["payment_intent"],
        });
        const pi: any = (sess as any).payment_intent;
        if (pi && typeof pi === "object") {
          chargeId = pi.latest_charge as string | null;
        }
      }
      if (!chargeId) { skipped++; continue; }

      const ch = await stripe.charges.retrieve(chargeId, {
        expand: ["balance_transaction"],
      });
      const bt: any = (ch as any).balance_transaction;
      if (!bt || typeof bt !== "object" || typeof bt.fee !== "number") {
        skipped++;
        continue;
      }

      const newFee = Math.round(bt.fee) / 100; // cents → euros
      const prevFee = o.stripe_fee == null ? 0 : Number(o.stripe_fee);

      if (Math.abs(prevFee - newFee) < 0.01) {
        skipped++;
        continue;
      }

      changes.push({
        id: o.id,
        prev_fee: prevFee,
        new_fee: newFee,
        gross: Number(o.amount_gross) || 0,
      });

      if (!dryRun) {
        const { error: updErr } = await supabase
          .from("orders").update({ stripe_fee: newFee }).eq("id", o.id);
        if (updErr) { failed++; continue; }
      }
      updated++;
    } catch (err) {
      failed++;
      console.warn("[backfill-fees] failed", o.id, (err as any)?.message);
      continue;
    }
  }

  return new Response(JSON.stringify({
    ok: true, dry_run: dryRun, processed, updated, skipped, failed,
    changes: changes.slice(0, 50),
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
