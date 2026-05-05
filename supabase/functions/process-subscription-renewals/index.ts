// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Special discount coupons (50% lifetime) for migrated users
const LIFETIME_50_COUPON = "PA0H0IaT";
const SPECIAL_DISCOUNT_EMAILS = new Set([
  "cool_2113@hotmail.com",
  "javichiplayer@gmail.com",
]);

function getPriceId(tier: string): { priceId: string; credits: number } {
  const map: Record<string, { priceId: string; credits: number }> = {
    'monthly':    { priceId: 'price_1T8n6lFULeu7PzK60TbO76hE', credits: 8    },
    'annual_100': { priceId: 'price_1T8n6CFULeu7PzK6vs7NZyiJ', credits: 100  },
    'annual_200': { priceId: 'price_1TMapTFULeu7PzK640B5uuEq', credits: 200  },
    'annual_300': { priceId: 'price_1TMapTFULeu7PzK6D4GnB3Il', credits: 300  },
    'annual_400': { priceId: 'price_1TMapTFULeu7PzK6cNJMf2oL', credits: 500  },
    'annual_500': { priceId: 'price_1TMapTFULeu7PzK6ziUW5fLn', credits: 1000 },
  };
  return map[tier] ?? map['annual_100'];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const log = async (entry: {
    user_id?: string | null;
    email?: string | null;
    action: string;
    detail?: string;
  }) => {
    await supabase.from("renewal_log").insert(entry);
  };

  // Parse optional body for dry_run flag
  let dryRun = false;
  try {
    const bodyText = await req.text();
    const bodyJson = bodyText ? JSON.parse(bodyText) : {};
    dryRun = bodyJson.dry_run === true;
  } catch (_) { /* ignore body parse errors */ }
  if (dryRun) console.log('[renewals] *** DRY RUN MODE — no changes will be made ***');
  const dryRunResults: any[] = [];

  try {
    // ─────────────────────────────────────────────────────────────
    // 1. SAFETY FLAG CHECK — must run before ANY Stripe call
    // ─────────────────────────────────────────────────────────────
    const { data: flagRow, error: flagErr } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "subscription_billing_enabled")
      .maybeSingle();

    if (flagErr) {
      console.error("[renewals] Failed to read flag:", flagErr);
      return new Response(JSON.stringify({ error: "flag_read_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const enabled = flagRow?.value === true || flagRow?.value === "true";
    if (!enabled) {
      console.log("[renewals] subscription_billing_enabled=false → exiting");
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "billing disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Stripe client (only after flag check)
    // ─────────────────────────────────────────────────────────────
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-06-20",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // ─────────────────────────────────────────────────────────────
    // 3. Fetch subscriptions due in next 3 days
    // ─────────────────────────────────────────────────────────────
    const cutoffISO = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: subs, error: subsErr } = await supabase
      .from("subscriptions")
      .select("id, user_id, tier, plan, status, current_period_start, current_period_end, stripe_customer_id")
      .eq("status", "active")
      .lte("current_period_end", cutoffISO);

    if (subsErr) throw subsErr;

    // Heartbeat: always log a run so watchdog can detect cron health, even with 0 subs
    await log({ action: "heartbeat", detail: `subs_due=${subs?.length ?? 0}` });

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve customer ids + emails
    const userIds = subs.map((s) => s.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, stripe_customer_id")
      .in("user_id", userIds);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.user_id, p.stripe_customer_id]),
    );

    // Get emails via admin auth
    const emailMap = new Map<string, string>();
    for (const uid of userIds) {
      const { data: u } = await supabase.auth.admin.getUserById(uid);
      if (u?.user?.email) emailMap.set(uid, u.user.email);
    }

    let created = 0, skipped = 0, failed = 0, noPM = 0;

    for (const sub of subs) {
      const email = emailMap.get(sub.user_id) ?? null;
      const customerId = sub.stripe_customer_id ?? profileMap.get(sub.user_id);

      if (!customerId) {
        if (dryRun) {
          dryRunResults.push({
            user_id: sub.user_id,
            email,
            tier: sub.tier ?? sub.plan ?? 'annual_100',
            customer_id: 'MISSING',
            credits_would_reset_to: getPriceId(sub.tier ?? sub.plan ?? 'annual_100').credits,
            action: 'would_skip_no_customer',
          });
          skipped++;
          continue;
        }
        await log({
          user_id: sub.user_id,
          email,
          action: "skipped",
          detail: "missing stripe_customer_id",
        });
        skipped++;
        continue;
      }

      const tier = sub.tier ?? sub.plan ?? "annual_100";
      const { priceId, credits: tierCredits } = getPriceId(tier);

      if (dryRun) {
        dryRunResults.push({
          user_id: sub.user_id,
          email,
          tier,
          customer_id: customerId,
          credits_would_reset_to: tierCredits,
          action: 'would_renew',
        });
        created++;
        continue;
      }

      try {
        // a) Already has an active Stripe subscription?
        const existing = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 1,
        });

        if (existing.data.length > 0) {
          const ss = existing.data[0];
          await supabase
            .from("subscriptions")
            .update({
              current_period_start: new Date((ss as any).current_period_start * 1000).toISOString(),
              current_period_end: new Date((ss as any).current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", sub.id);

          await log({
            user_id: sub.user_id,
            email,
            action: "skipped",
            detail: `already has active stripe subscription ${ss.id}`,
          });
          skipped++;
          continue;
        }

        // b) Create new Stripe subscription
        const createParams: any = {
          customer: customerId,
          items: [{ price: priceId }],
          payment_behavior: "allow_incomplete",
          proration_behavior: "none",
          metadata: {
            user_id: sub.user_id,
            migrated: "true",
            tier,
          },
        };

        if (email && SPECIAL_DISCOUNT_EMAILS.has(email.toLowerCase())) {
          createParams.coupon = LIFETIME_50_COUPON;
        }

        const newSub = await stripe.subscriptions.create(createParams);

        // Map Stripe status to our status
        const KNOWN_STATUSES = ["active","trialing","incomplete","past_due","incomplete_expired","canceled","unpaid","paused"];
        let newStatus = "active";
        if (newSub.status === "active" || newSub.status === "trialing") {
          newStatus = "active";
        } else if (newSub.status === "incomplete" || newSub.status === "past_due") {
          newStatus = "past_due";
        } else {
          newStatus = "past_due";
          // Unknown / unmapped Stripe status → raise admin alert
          if (!KNOWN_STATUSES.includes(newSub.status)) {
            await supabase.from("admin_alerts").insert({
              source: "stripe_unmapped_status",
              severity: "error",
              message: `Estado Stripe no mapeado al renovar: "${newSub.status}"`,
              context: {
                stripe_subscription_id: newSub.id,
                stripe_status: newSub.status,
                user_id: sub.user_id,
                email,
                tier,
              },
            });
          }
        }

        // Calculate credits to add (only if payment succeeded)
        const { credits } = getPriceId(tier);
        const shouldAddCredits = newStatus === "active";

        await supabase
          .from("subscriptions")
          .update({
            stripe_subscription_id: newSub.id,
            stripe_customer_id: customerId,
            current_period_start: new Date((newSub as any).current_period_start * 1000).toISOString(),
            current_period_end: new Date((newSub as any).current_period_end * 1000).toISOString(),
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sub.id);

        // Reset credits to plan value (no acumular) only if payment succeeded
        if (shouldAddCredits && credits > 0) {
          await supabase
            .from("profiles")
            .update({
              available_credits: credits,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", sub.user_id);

          await supabase.from("credit_transactions").insert({
            user_id: sub.user_id,
            amount: credits,
            type: "renewal",
            description: `Renovación: créditos reiniciados a ${credits} (${tier})`,
          });
        }

        await log({
          user_id: sub.user_id,
          email,
          action: "created",
          detail: `stripe sub ${newSub.id} status=${newSub.status} credits_reset=${shouldAddCredits}`,
        });
        created++;
      } catch (err: any) {
        const msg = String(err?.message ?? err);
        const isPM = /payment method|no.*source|invoice.*payment/i.test(msg);

        if (isPM) {
          await supabase
            .from("subscriptions")
            .update({ status: "past_due", updated_at: new Date().toISOString() })
            .eq("id", sub.id);

          await log({
            user_id: sub.user_id,
            email,
            action: "no_payment_method",
            detail: msg.slice(0, 500),
          });
          noPM++;
        } else {
          await log({
            user_id: sub.user_id,
            email,
            action: "failed",
            detail: msg.slice(0, 500),
          });
          failed++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        total: subs.length,
        created,
        skipped,
        no_payment_method: noPM,
        failed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[renewals] Fatal error:", err);
    try {
      await supabase.from("admin_alerts").insert({
        source: "renewals_fatal",
        severity: "critical",
        message: "Fallo fatal en process-subscription-renewals",
        context: { error: String(err?.message ?? err).slice(0, 1000) },
      });
    } catch (_) { /* swallow */ }
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
