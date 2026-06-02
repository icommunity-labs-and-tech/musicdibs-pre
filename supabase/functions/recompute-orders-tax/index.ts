// Recompute orders.amount_net using REAL Stripe tax data (invoice.tax / session.amount_tax).
// Replaces the old assumption that every order had 21% IVA baked in.
//
// Auth: x-cron-secret header OR service-role bearer OR an admin's JWT.
//
// Body (all optional):
//   { from?: ISO date, to?: ISO date, limit?: number, dry_run?: boolean, only_null?: boolean }
//
// Defaults: only_null = false (recompute all), limit = 500, dry_run = false.

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";
import { netFromCharge, netFromInvoice, netFromSession } from "../_shared/stripe-net.ts";

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
  const onlyNull = !!body.only_null;

  let q = supabase
    .from("orders")
    .select("id, amount_gross, amount_net, stripe_charge_id, stripe_invoice_id, stripe_checkout_session_id, paid_at")
    .order("paid_at", { ascending: false })
    .limit(limit);
  if (from) q = q.gte("paid_at", from);
  if (to) q = q.lte("paid_at", to);
  if (onlyNull) q = q.is("amount_net", null);

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
    const gross = Number(o.amount_gross) || 0;
    let newNet: number | null = null;

    try {
      if (o.stripe_invoice_id) {
        const inv = await stripe.invoices.retrieve(o.stripe_invoice_id);
        newNet = netFromInvoice(inv);
      } else if (o.stripe_checkout_session_id) {
        const sess = await stripe.checkout.sessions.retrieve(o.stripe_checkout_session_id);
        newNet = netFromSession(sess);
      } else if (o.stripe_charge_id) {
        const ch = await stripe.charges.retrieve(o.stripe_charge_id, {
          expand: ["invoice"],
        });
        newNet = await netFromCharge(stripe, ch);
      } else {
        // No Stripe reference → assume no IVA.
        newNet = gross;
      }
    } catch (err) {
      failed++;
      console.warn("[recompute] failed", o.id, (err as any)?.message);
      continue;
    }

    if (newNet == null || !isFinite(newNet)) { failed++; continue; }
    newNet = Math.round(newNet * 100) / 100;

    const prevNet = o.amount_net == null ? null : Number(o.amount_net);
    if (prevNet != null && Math.abs(prevNet - newNet) < 0.01) {
      skipped++;
      continue;
    }

    changes.push({ id: o.id, prev_net: prevNet, new_net: newNet, gross });

    if (!dryRun) {
      const { error: updErr } = await supabase
        .from("orders").update({ amount_net: newNet }).eq("id", o.id);
      if (updErr) { failed++; continue; }
    }
    updated++;
  }

  return new Response(JSON.stringify({
    ok: true, dry_run: dryRun, processed, updated, skipped, failed,
    changes: changes.slice(0, 50), // sample
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
