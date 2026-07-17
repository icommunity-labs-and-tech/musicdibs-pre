import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") || "";
  const adminToken = req.headers.get("x-admin-token") || "";
  const ONE_TIME_TOKEN = "backfill-musicdibs-2026-06-22-a7f3";
  const isAuth = authHeader === `Bearer ${serviceKey}` || adminToken === ONE_TIME_TOKEN;
  if (!isAuth) return json({ error: "Unauthorized" }, 401);

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") !== "false";

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" as any });

  function toISO(val: any, fallback?: string): string {
    if (val === null || val === undefined) return fallback ?? new Date().toISOString();
    if (typeof val === "string") { const d = new Date(val); if (!isNaN(d.getTime())) return d.toISOString(); }
    if (typeof val === "number" && val > 0) { const ms = val < 1e12 ? val * 1000 : val; const d = new Date(ms); if (!isNaN(d.getTime())) return d.toISOString(); }
    return fallback ?? new Date().toISOString();
  }

  const { data: activePlans, error: plansErr } = await supabase
    .from("profiles").select("user_id, subscription_plan, stripe_customer_id")
    .in("subscription_plan", ["Annual", "Monthly"]).not("stripe_customer_id", "is", null);
  if (plansErr) return json({ error: plansErr.message }, 500);
  if (!activePlans?.length) return json({ message: "No active plans found", processed: 0 });

  const { data: existingSubs } = await supabase.from("subscriptions").select("user_id");
  const existingIds = new Set((existingSubs || []).map((s: any) => s.user_id));
  const missing = activePlans.filter((p: any) => !existingIds.has(p.user_id));
  if (!missing.length) return json({ message: "All users already have subscriptions rows", processed: 0 });

  const results: any[] = [];

  for (const profile of missing) {
    const { user_id, subscription_plan, stripe_customer_id } = profile;
    try {
      let stripeSub: any = null;
      for (const status of ["active", "past_due", "trialing"] as const) {
        const subs = await stripe.subscriptions.list({ customer: stripe_customer_id, status, limit: 5, expand: ["data.items.data.price"] });
        if (subs.data.length > 0) { stripeSub = subs.data.sort((a: any, b: any) => b.created - a.created)[0]; break; }
      }
      if (!stripeSub) {
        const cancelled = await stripe.subscriptions.list({ customer: stripe_customer_id, status: "canceled", limit: 5, expand: ["data.items.data.price"] });
        if (cancelled.data.length > 0) stripeSub = cancelled.data.sort((a: any, b: any) => b.created - a.created)[0];
      }
      if (!stripeSub) { results.push({ user_id, stripe_customer_id, plan: subscription_plan, status: "skipped", reason: "No Stripe subscription found" }); continue; }

      const statusMap: Record<string, string> = { active: "active", past_due: "past_due", trialing: "active", canceled: "cancelled", unpaid: "past_due", incomplete: "past_due", incomplete_expired: "cancelled", paused: "past_due" };
      const mappedStatus = statusMap[stripeSub.status] ?? "cancelled";
      const priceInterval = (stripeSub as any).items?.data?.[0]?.price?.recurring?.interval ?? "year";
      const planType = priceInterval === "month" ? "monthly" : "annual";

      const now = new Date().toISOString();
      const row = {
        user_id,
        stripe_subscription_id: stripeSub.id,
        stripe_customer_id,
        plan: subscription_plan,          // "Annual" | "Monthly" — NOT NULL
        plan_type: planType,              // "annual" | "monthly"
        status: mappedStatus,
        current_period_start: toISO(stripeSub.current_period_start, now),
        current_period_end:   toISO(stripeSub.current_period_end, now),
        created_at: toISO(stripeSub.created, now),
        updated_at: now,
        cancel_at_period_end: (stripeSub as any).cancel_at_period_end ?? false,
      };

      if (!dryRun) {
        const { error: insertErr } = await supabase.from("subscriptions").insert(row);
        if (insertErr) { results.push({ user_id, stripe_subscription_id: stripeSub.id, status: "error", error: insertErr.message }); continue; }
      }

      results.push({ user_id, stripe_subscription_id: stripeSub.id, stripe_status: stripeSub.status, mapped_status: mappedStatus, plan_type: planType, current_period_end: row.current_period_end, status: dryRun ? "would_insert" : "inserted" });
    } catch (err: any) {
      results.push({ user_id, stripe_customer_id, status: "error", error: err.message });
    }
  }

  const inserted    = results.filter(r => r.status === "inserted").length;
  const wouldInsert = results.filter(r => r.status === "would_insert").length;
  const errors      = results.filter(r => r.status === "error").length;
  const skipped     = results.filter(r => r.status === "skipped").length;

  return json({ dry_run: dryRun, missing_count: missing.length, inserted: dryRun ? 0 : inserted, would_insert: dryRun ? wouldInsert : 0, errors, skipped, results });
});
