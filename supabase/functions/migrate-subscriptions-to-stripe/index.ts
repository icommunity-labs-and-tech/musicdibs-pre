import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

// Price IDs for live account acct_1JLVRuFULeu7PzK6
const TIER_PRICES: Record<string, string> = {
  monthly:    "price_1T8n6lFULeu7PzK60TbO76hE",
  annual_100: "price_1T8n6CFULeu7PzK6vs7NZyiJ",
  annual_200: "price_1TMapTFULeu7PzK640B5uuEq",
  annual_300: "price_1TMapTFULeu7PzK6D4GnB3Il",
  annual_400: "price_1TMapTFULeu7PzK6cNJMf2oL",
  annual_500: "price_1TMapTFULeu7PzK6ziUW5fLn",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth via CRON_SECRET
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    if (!expectedSecret || cronSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse params
    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dry_run") === "true";
    const batchSize = Math.min(parseInt(url.searchParams.get("batch") || "15"), 30);
    const planFilter = url.searchParams.get("plan"); // "Monthly" or "Annual"

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    ) as any;

    // Get subscriptions without stripe_subscription_id
    let query = supabase
      .from("subscriptions")
      .select("id, user_id, plan, tier, status, current_period_end, stripe_subscription_id")
      .eq("status", "active")
      .is("stripe_subscription_id", null)
      .order("current_period_end", { ascending: true })
      .limit(batchSize);

    if (planFilter) query = query.eq("plan", planFilter);

    const { data: subs, error: subsErr } = await query;
    if (subsErr) throw subsErr;

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({
        ok: true, dry_run: dryRun, message: "No subscriptions to migrate", remaining: 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get profiles for stripe_customer_id
    const userIds = subs.map((s: any) => s.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, stripe_customer_id")
      .in("user_id", userIds);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.stripe_customer_id]));

    // Get emails
    const emailMap = new Map<string, string>();
    for (const uid of userIds) {
      const { data: u } = await supabase.auth.admin.getUserById(uid);
      if (u?.user?.email) emailMap.set(uid, u.user.email);
    }

    // Process each subscription
    const results: any[] = [];
    let created = 0, no_customer = 0, no_pm = 0, errors = 0, already_has = 0;

    for (const sub of subs) {
      const email = emailMap.get(sub.user_id) ?? "unknown";
      const customerId = profileMap.get(sub.user_id);

      if (!customerId) {
        results.push({ email, action: "no_customer", detail: "No stripe_customer_id" });
        no_customer++;
        continue;
      }

      try {
        // Check if customer already has an active Stripe subscription
        const existing = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 1,
        });

        if (existing.data.length > 0) {
          const ss = existing.data[0];
          if (!dryRun) {
            await supabase
              .from("subscriptions")
              .update({
                stripe_subscription_id: ss.id,
                current_period_start: new Date((ss as any).current_period_start * 1000).toISOString(),
                current_period_end: new Date((ss as any).current_period_end * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", sub.id);
          }
          results.push({ email, action: "linked_existing", stripe_sub: ss.id });
          already_has++;
          continue;
        }

        // Check if customer has a default payment method
        const customer = await stripe.customers.retrieve(customerId) as any;
        const defaultPM = customer.invoice_settings?.default_payment_method || customer.default_source;

        if (!defaultPM) {
          results.push({ email, action: "no_payment_method", customer: customerId });
          no_pm++;
          continue;
        }

        // Determine price
        const tier = sub.tier ?? (sub.plan === "Monthly" ? "monthly" : "annual_100");
        const priceId = TIER_PRICES[tier] ?? TIER_PRICES["annual_100"];

        // Calculate trial_end
        const periodEnd = new Date(sub.current_period_end);
        const trialEndTs = Math.floor(periodEnd.getTime() / 1000);
        const now = Math.floor(Date.now() / 1000);
        const useTrialEnd = trialEndTs > now + 86400; // >24h from now

        if (dryRun) {
          results.push({
            email, action: "would_create", customer: customerId, tier, priceId,
            trial_end: useTrialEnd ? periodEnd.toISOString() : "immediate",
            has_pm: !!defaultPM,
          });
          created++;
          continue;
        }

        // Create Stripe subscription
        const createParams: any = {
          customer: customerId,
          items: [{ price: priceId }],
          proration_behavior: "none",
          metadata: {
            user_id: sub.user_id,
            migrated_from_wps: "true",
            tier,
          },
        };

        if (useTrialEnd) {
          createParams.trial_end = trialEndTs;
        } else {
          createParams.payment_behavior = "default_incomplete";
        }

        const newSub = await stripe.subscriptions.create(createParams);

        // Update Supabase with stripe_subscription_id
        await supabase
          .from("subscriptions")
          .update({
            stripe_subscription_id: newSub.id,
            current_period_start: new Date((newSub as any).current_period_start * 1000).toISOString(),
            current_period_end: new Date((newSub as any).current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", sub.id);

        // Also update profiles.subscription_plan
        const planName = sub.plan === "Monthly" ? "Monthly" : "Annual";
        await supabase
          .from("profiles")
          .update({ subscription_plan: planName, updated_at: new Date().toISOString() })
          .eq("user_id", sub.user_id);

        results.push({ email, action: "created", stripe_sub: newSub.id, tier });
        created++;

      } catch (err: any) {
        const msg = String(err?.message ?? err);
        results.push({ email, action: "error", detail: msg.slice(0, 300) });
        errors++;
      }
    }

    // Count remaining
    let remainingQuery = supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .is("stripe_subscription_id", null);
    if (planFilter) remainingQuery = remainingQuery.eq("plan", planFilter);
    const { count: remaining } = await remainingQuery;

    return new Response(JSON.stringify({
      ok: true,
      dry_run: dryRun,
      batch_size: subs.length,
      created,
      already_has,
      no_customer,
      no_payment_method: no_pm,
      errors,
      remaining: Math.max(0, (remaining ?? 0) - (dryRun ? 0 : created + already_has)),
      results,
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("[migrate-subs] Fatal:", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
