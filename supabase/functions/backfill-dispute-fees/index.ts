// Backfill orders.dispute_fee from Stripe disputes. Iterates over recent
// disputes (or a given date range), resolves the related order via
// stripe_charge_id, and stores the merchant's net dispute cost
// (sum of balance_transactions[].fee) in euros.
//
// Auth: x-cron-secret header OR service-role bearer OR admin JWT.
//
// Body (all optional):
//   { from?: ISO date, to?: ISO date, limit?: number, dry_run?: boolean }
//
// Defaults: limit = 200, dry_run = false.

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
    try {
      const token = authHeader.replace("Bearer ", "");
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload?.role === "service_role") authorized = true;
    } catch { /* ignore */ }
  }

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
    console.log("[backfill-dispute-fees] 401 — authHeaderPresent:", !!authHeader, "startsWithBearer:", authHeader.startsWith("Bearer "), "cronSecretPresent:", !!cronSecret);
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
  const limit = Math.min(Math.max(Number(body.limit ?? 200), 1), 1000);
  const dryRun = !!body.dry_run;

  const created: Record<string, number> = {};
  if (from) created.gte = Math.floor(new Date(from).getTime() / 1000);
  if (to) created.lte = Math.floor(new Date(to).getTime() / 1000);

  let processed = 0, updated = 0, skipped = 0, failed = 0;
  const changes: any[] = [];

  for await (const dispute of stripe.disputes.list({
    limit: 100,
    ...(Object.keys(created).length ? { created } : {}),
    expand: ["data.balance_transactions"],
  })) {
    if (processed >= limit) break;
    processed++;

    try {
      const chargeId = typeof dispute.charge === "string"
        ? dispute.charge
        : (dispute.charge as any)?.id ?? "";
      if (!chargeId) { skipped++; console.log("[skip] no-charge", dispute.id); continue; }

      const txs = ((dispute as any).balance_transactions || []) as any[];
      const feeCents = txs.reduce(
        (s, t) => s + (typeof t?.fee === "number" ? t.fee : 0),
        0,
      );
      const feeEur = Math.round(feeCents) / 100;

      const { data: ord } = await supabase
        .from("orders")
        .select("id, dispute_fee")
        .eq("stripe_charge_id", chargeId)
        .maybeSingle();

      if (!ord?.id) { skipped++; console.log("[skip] no-order", dispute.id, chargeId, "feeEur=", feeEur); continue; }

      const prev = Number(ord.dispute_fee) || 0;
      if (Math.abs(prev - feeEur) < 0.01) { skipped++; console.log("[skip] match", dispute.id, "prev=", prev, "feeEur=", feeEur); continue; }

      changes.push({ order_id: ord.id, dispute_id: dispute.id, prev, new: feeEur });

      if (!dryRun) {
        const { error: updErr } = await supabase
          .from("orders").update({ dispute_fee: feeEur }).eq("id", ord.id);
        if (updErr) { failed++; continue; }
      }
      updated++;
    } catch (err) {
      failed++;
      console.warn("[backfill-dispute-fees] failed", dispute.id, (err as any)?.message);
    }
  }

  return new Response(JSON.stringify({
    ok: true, dry_run: dryRun, processed, updated, skipped, failed,
    changes: changes.slice(0, 50),
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
