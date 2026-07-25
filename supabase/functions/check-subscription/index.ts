import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "./_shared/supabase-client.ts";
import { PRICE_PLAN, PRICE_TO_TIER } from "./_shared/stripe-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// D1: Stripe singleton at module level — reuses HTTP connections across requests
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2026-02-25.clover",
});

const ACTIVE_SUB_STATUSES = new Set(["active", "trialing", "past_due", "unpaid"]);

const toIsoDate = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === "number") return new Date(value * 1000).toISOString();
  if (typeof value === "string") {
    const parsed = value.includes("T") ? new Date(value) : new Date(Number(value) * 1000 || value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null && "toISOString" in value) {
    try { return (value as { toISOString: () => string }).toISOString(); } catch { return null; }
  }
  return null;
};

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3, label = ""): Promise<T> {
  for (let i = 0; i < maxAttempts; i++) {
    try { return await fn(); }
    catch (err: unknown) {
      const e = err as { type?: string; statusCode?: number };
      const isRetryable = e?.type === "StripeRateLimitError" || (e?.statusCode ?? 0) >= 500;
      if (isRetryable && i < maxAttempts - 1) {
        const delay = 500 * Math.pow(2, i);
        console.warn(`[CHECK-SUBSCRIPTION] Retrying ${label} after ${delay}ms (attempt ${i + 1})`);
        await new Promise(r => setTimeout(r, delay));
      } else throw err;
    }
  }
  throw new Error("withRetry: max attempts exceeded");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    logStep("Function started");

    if (!Deno.env.get("STRIPE_SECRET_KEY")) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !userData?.user?.id) {
      logStep("JWT validation failed, returning graceful response");
      return new Response(JSON.stringify({ subscribed: false, plan: "Free", cancel_at_period_end: false, subscription_end: null, auth_error: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;
    if (!userEmail) throw new Error("User email not available in token");
    logStep("User authenticated", { userId, email: userEmail });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // M3: Check DB for cached stripe_customer_id first — avoids slow email lookup on every call
    const { data: cachedProfile } = await supabaseClient
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    let customerId: string | null = cachedProfile?.stripe_customer_id ?? null;

    if (customerId) {
      logStep("Found stripe_customer_id in DB cache", { customerId });
    } else {
      logStep("stripe_customer_id not cached, falling back to Stripe email lookup");
      const customers = await withRetry(
        () => stripe.customers.list({ email: userEmail, limit: 1 }),
        3, "customers.list"
      );
      if (customers.data.length === 0) {
        logStep("No Stripe customer found, setting Free plan");
        await supabaseClient.from("profiles").update({ subscription_plan: "Free", subscription_tier: "free" }).eq("user_id", userId);
        return new Response(JSON.stringify({ subscribed: false, plan: "Free", cancel_at_period_end: false, subscription_end: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      customerId = customers.data[0].id;
      logStep("Found Stripe customer via email lookup", { customerId });
    }

    // Persist customer_id if not yet cached in DB
    await supabaseClient
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("user_id", userId)
      .is("stripe_customer_id", null);

    const subscriptions = await withRetry(
      () => stripe.subscriptions.list({ customer: customerId!, status: "all", limit: 10 }),
      3, "subscriptions.list"
    );

    const subscription = subscriptions.data.find((sub) => ACTIVE_SUB_STATUSES.has(sub.status));

    if (!subscription) {
      logStep("No active Stripe subscription — checking local subscriptions table");

      const { data: localSub } = await supabaseClient
        .from("subscriptions")
        .select("id, user_id, plan, status, current_period_end, tier, cancel_at_period_end")
        .eq("user_id", userId)
        .eq("status", "active")
        .gte("current_period_end", new Date().toISOString())
        .maybeSingle();

      if (localSub) {
        logStep("Found valid local subscription", { plan: localSub.plan, current_period_end: localSub.current_period_end });
        // FIX 2026-07-25: incluir subscription_tier (ya disponible en localSub) --
        // el trigger trg_sync_plan_from_tier revertia subscription_plan al valor
        // derivado del tier antiguo si solo se actualizaba plan.
        await supabaseClient
          .from("profiles")
          .update({ subscription_plan: localSub.plan, subscription_tier: localSub.tier, updated_at: new Date().toISOString() })
          .eq("user_id", userId)
          .neq("subscription_plan", localSub.plan);
        return new Response(
          JSON.stringify({ subscribed: true, plan: localSub.plan, subscription_end: localSub.current_period_end, cancel_at_period_end: localSub.cancel_at_period_end ?? false, source: "local_subscription" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: staleSub } = await supabaseClient
        .from("subscriptions")
        .select("id, user_id, plan")
        .eq("user_id", userId)
        .eq("status", "active")
        .lt("current_period_end", new Date().toISOString())
        .maybeSingle();

      if (staleSub) {
        logStep("Auto-expiring stale subscription", { subId: staleSub.id, plan: staleSub.plan });
        await supabaseClient.from("subscriptions").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", staleSub.id);
        await supabaseClient.from("profiles").update({ subscription_plan: "Free", subscription_tier: "free", updated_at: new Date().toISOString() }).eq("user_id", staleSub.user_id).neq("subscription_plan", "Free");
        logStep(`Auto-expired stale sub for user ${staleSub.user_id} (was ${staleSub.plan})`);
      }

      logStep("No valid subscription found, setting Free plan");
      await supabaseClient.from("profiles").update({ subscription_plan: "Free", subscription_tier: "free" }).eq("user_id", userId);
      return new Response(
        JSON.stringify({ subscribed: false, plan: "Free", cancel_at_period_end: false, subscription_end: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Grace period check for past_due / unpaid subscriptions.
    // If payment_grace_expires_at is set and has passed → deny access.
    // This prevents monthly subscribers from getting ~30 free days during Stripe's dunning period.
    if (subscription.status === "past_due" || subscription.status === "unpaid") {
      const { data: graceProfile } = await supabaseClient
        .from("profiles")
        .select("payment_grace_expires_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (graceProfile?.payment_grace_expires_at) {
        const graceExpires = new Date(graceProfile.payment_grace_expires_at);
        if (graceExpires < new Date()) {
          logStep("Grace period expired — denying access", {
            userId,
            expired: graceProfile.payment_grace_expires_at,
            stripeStatus: subscription.status,
          });
          await supabaseClient
            .from("profiles")
            .update({ subscription_plan: "Free", subscription_tier: "free" })
            .eq("user_id", userId);
          return new Response(
            JSON.stringify({ subscribed: false, plan: "Free", cancel_at_period_end: false, subscription_end: null }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        logStep("Grace period still active", { userId, expires: graceProfile.payment_grace_expires_at });
      }
    }

    const priceId = subscription.items.data[0]?.price?.id;
    // D3: Use shared PRICE_PLAN and PRICE_TO_TIER maps (fixes annual_400/annual_500 tier name bugs)
    const plan = priceId ? (PRICE_PLAN[priceId] || "Monthly") : "Monthly";
    const tier = priceId ? (PRICE_TO_TIER[priceId] ?? null) : null;
    const cancelAtPeriodEnd = subscription.cancel_at_period_end === true;

    const itemPeriodEnd = (subscription.items.data[0] as { current_period_end?: number })?.current_period_end;
    const periodEndRaw = itemPeriodEnd ?? (subscription as unknown as { current_period_end?: number }).current_period_end ?? (subscription as unknown as { cancel_at?: number }).cancel_at ?? (subscription as unknown as { ended_at?: number }).ended_at;
    const subscriptionEnd = toIsoDate(periodEndRaw);

    logStep("Subscription resolved", { status: subscription.status, plan, tier, priceId, cancelAtPeriodEnd, subscriptionEnd });

    await supabaseClient.from("profiles").update({ subscription_plan: plan, subscription_tier: tier }).eq("user_id", userId);

    return new Response(JSON.stringify({ subscribed: true, plan, subscription_end: subscriptionEnd, cancel_at_period_end: cancelAtPeriodEnd }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
