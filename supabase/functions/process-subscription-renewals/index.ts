import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { TIER_TO_PRICE_ID, TIER_CREDITS } from "./_shared/stripe-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function getPriceId(tier: string): { priceId: string; credits: number } {
  const priceId = TIER_TO_PRICE_ID[tier] ?? TIER_TO_PRICE_ID["annual_100"];
  const credits = TIER_CREDITS[tier] ?? TIER_CREDITS["annual_100"];
  return { priceId, credits };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const authHeader = req.headers.get("Authorization") || "";
  const cronHeader = req.headers.get("x-cron-secret") || "";
  const isSystemAuth =
    (cronSecret && cronHeader === cronSecret) ||
    (serviceKey && authHeader === `Bearer ${serviceKey}`);

  let isAdminAuth = false;
  if (!isSystemAuth && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user?.id) {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      isAdminAuth = roleRow?.role === "admin";
    }
  }

  const isAuth = isSystemAuth || isAdminAuth;
  if (!isAuth) {
    console.warn("[renewals] Unauthorized probe ignored");
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: "authentication_required" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const log = async (entry: {
    user_id?: string | null;
    email?: string | null;
    action: string;
    detail?: string;
  }) => {
    await supabase.from("renewal_log").insert(entry);
  };

  let dryRun = false;
  try {
    const bodyText = await req.text();
    const bodyJson = bodyText ? JSON.parse(bodyText) as Record<string, unknown> : {};
    dryRun = bodyJson.dry_run === true;
  } catch (_) { /* ignore body parse errors */ }
  if (isAdminAuth && !isSystemAuth) dryRun = true;
  if (dryRun) console.log("[renewals] *** DRY RUN MODE — no changes will be made ***");

  interface DryRunResult {
    user_id: string;
    email: string | null;
    tier: string;
    customer_id: string;
    credits_would_reset_to: number;
    permanent_credits: number;
    total_credits_after: number;
    lifetime_coupon?: string | null;
    action: string;
  }
  const dryRunResults: DryRunResult[] = [];

  interface ExpiredCancelledResult {
    user_id: string;
    email: string | null;
    tier: string;
    subscription_credits_removed: number;
    permanent_credits: number;
    available_credits_after: number;
    action: string;
  }
  const expiredCancelledResults: ExpiredCancelledResult[] = [];

  let expiredCancelledCount = 0;
  let expiredCancelledFailed = 0;

  try {
    // 0. DEFERRED RESET: cancelaciones anticipadas cuyo periodo ya terminó.
    // Estas suscripciones tienen status='cancelled' y cancel_at_period_end=true
    // (el usuario canceló pero conservó plan/créditos hasta el fin del periodo
    // ya pagado). Cuando current_period_end <= now, toca aplicar el downgrade
    // a Free y retirar los créditos temporales de la suscripción, conservando
    // los permanent_credits. Este bloque corre SIEMPRE, independientemente del
    // flag subscription_billing_enabled (no genera cargos ni renovaciones,
    // solo cierra el ciclo de cancelaciones ya decididas).
    const nowISO = new Date().toISOString();
    const { data: expiredCancelledSubs, error: expiredErr } = await supabase
      .from("subscriptions")
      .select("id, user_id, tier, plan, status, current_period_end, cancel_at_period_end, stripe_customer_id")
      .eq("status", "cancelled")
      .eq("cancel_at_period_end", true)
      .lte("current_period_end", nowISO);

    if (expiredErr) throw expiredErr;

    if (expiredCancelledSubs && expiredCancelledSubs.length > 0) {
      const expiredUserIds = expiredCancelledSubs.map((s) => s.user_id);
      const { data: expiredProfiles } = await supabase
        .from("profiles")
        .select("user_id, available_credits, permanent_credits, subscription_plan, subscription_tier")
        .in("user_id", expiredUserIds);

      const expiredProfileMap = new Map(
        (expiredProfiles ?? []).map((p) => [p.user_id, p]),
      );

      const expiredEmailMap = new Map<string, string>();
      for (const uid of expiredUserIds) {
        const { data: u } = await supabase.auth.admin.getUserById(uid);
        if (u?.user?.email) expiredEmailMap.set(uid, u.user.email);
      }

      for (const sub of expiredCancelledSubs) {
        const email = expiredEmailMap.get(sub.user_id) ?? null;
        const profile = expiredProfileMap.get(sub.user_id);
        const tier = sub.tier ?? sub.plan ?? "annual_100";
        const currentAvailable = profile?.available_credits ?? 0;
        const permanentCredits = profile?.permanent_credits ?? 0;

        // FIX: usar min(currentAvailable, permanentCredits) en lugar de permanentCredits a secas.
        // Evita devolver créditos permanentes que el usuario ya había gastado antes de cancelar.
        // Ejemplos:
        //   avail=20, perm=10 → newAvailable=10 (remove 10 subscription credits, keep 10 perm) ✓
        //   avail=7,  perm=25 → newAvailable=7  (don't restore 18 already-spent perm credits)  ✓
        //   avail=0,  perm=0  → newAvailable=0  (nothing to remove)                            ✓
        const newAvailable = Math.min(currentAvailable, permanentCredits);
        const subscriptionCredits = currentAvailable - newAvailable;

        if (dryRun) {
          expiredCancelledResults.push({
            user_id: sub.user_id,
            email,
            tier,
            subscription_credits_removed: subscriptionCredits,
            permanent_credits: permanentCredits,
            available_credits_after: newAvailable,
            action: "would_expire_cancelled",
          });
          expiredCancelledCount++;
          continue;
        }

        try {
          await supabase
            .from("profiles")
            .update({
              available_credits: newAvailable,
              subscription_plan: "Free",
              subscription_tier: "free",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", sub.user_id);

          if (subscriptionCredits > 0) {
            await supabase.from("credit_transactions").insert({
              user_id: sub.user_id,
              amount: -subscriptionCredits,
              type: "admin_reset",
              description: `Fin de periodo tras cancelación: se retiran ${subscriptionCredits} créditos de suscripción (${tier}). Permanentes conservados: ${permanentCredits}.`,
            });
          }

          await supabase
            .from("subscriptions")
            .update({
              status: "expired",
              cancel_at_period_end: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", sub.id);

          await log({
            user_id: sub.user_id,
            email,
            action: "expired_cancelled",
            detail: `Cancelación anticipada finalizada: tier=${tier} subscription_credits_removed=${subscriptionCredits} permanent=${permanentCredits} available_after=${newAvailable}`,
          });
          expiredCancelledCount++;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          await log({ user_id: sub.user_id, email, action: "expired_cancelled_failed", detail: msg.slice(0, 500) });
          expiredCancelledFailed++;
        }
      }
    }

    // 1. SAFETY FLAG CHECK
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
        JSON.stringify({
          ok: true,
          skipped: true,
          reason: "billing disabled",
          dry_run: dryRun,
          expired_cancelled: expiredCancelledCount,
          expired_cancelled_failed: expiredCancelledFailed,
          expired_cancelled_results: dryRun ? expiredCancelledResults : undefined,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Stripe client
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // 3. Fetch subscriptions due today or already expired
    const cutoffISO = new Date().toISOString();
    const { data: subs, error: subsErr } = await supabase
      .from("subscriptions")
      .select("id, user_id, tier, plan, status, current_period_start, current_period_end, stripe_customer_id, lifetime_coupon")
      .eq("status", "active")
      .lte("current_period_end", cutoffISO);

    if (subsErr) throw subsErr;

    await log({ action: "heartbeat", detail: `subs_due=${subs?.length ?? 0} expired_cancelled=${expiredCancelledCount}` });

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({
        ok: true,
        dry_run: dryRun,
        processed: 0,
        results: dryRun ? [] : undefined,
        expired_cancelled: expiredCancelledCount,
        expired_cancelled_failed: expiredCancelledFailed,
        expired_cancelled_results: dryRun ? expiredCancelledResults : undefined,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Resolve customer ids, emails y permanent_credits
    const userIds = subs.map((s) => s.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, stripe_customer_id, permanent_credits")
      .in("user_id", userIds);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.user_id, {
        stripe_customer_id: p.stripe_customer_id,
        permanent_credits: p.permanent_credits ?? 0,
      }]),
    );

    const emailMap = new Map<string, string>();
    for (const uid of userIds) {
      const { data: u } = await supabase.auth.admin.getUserById(uid);
      if (u?.user?.email) emailMap.set(uid, u.user.email);
    }

    let created = 0, skipped = 0, failed = 0, noPM = 0;

    for (const sub of subs) {
      const email = emailMap.get(sub.user_id) ?? null;
      const profileData = profileMap.get(sub.user_id);
      const customerId = sub.stripe_customer_id ?? profileData?.stripe_customer_id;
      // permanent_credits: porción fija que siempre se conserva en available_credits
      const permanentCredits = profileData?.permanent_credits ?? 0;

      if (!customerId) {
        if (dryRun) {
          const { credits: tierCredits } = getPriceId(sub.tier ?? sub.plan ?? "annual_100");
          dryRunResults.push({
            user_id: sub.user_id,
            email,
            tier: sub.tier ?? sub.plan ?? "annual_100",
            customer_id: "MISSING",
            credits_would_reset_to: tierCredits,
            permanent_credits: permanentCredits,
            total_credits_after: tierCredits + permanentCredits,
            action: "would_skip_no_customer",
          });
          skipped++;
          continue;
        }
        await log({ user_id: sub.user_id, email, action: "skipped", detail: "missing stripe_customer_id" });
        skipped++;
        continue;
      }

      const tier = sub.tier ?? sub.plan ?? "annual_100";
      const { priceId, credits: tierCredits } = getPriceId(tier);
      // Total créditos tras renovar = créditos del plan (temporales) + permanentes
      const totalCreditsAfterRenewal = tierCredits + permanentCredits;

      if (dryRun) {
        dryRunResults.push({
          user_id: sub.user_id,
          email,
          tier,
          customer_id: customerId,
          credits_would_reset_to: tierCredits,
          permanent_credits: permanentCredits,
          total_credits_after: totalCreditsAfterRenewal,
          lifetime_coupon: sub.lifetime_coupon ?? null,
          action: "would_renew",
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
              stripe_subscription_id: ss.id,
              current_period_start: new Date(ss.current_period_start * 1000).toISOString(),
              current_period_end: new Date(ss.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", sub.id);

          await log({ user_id: sub.user_id, email, action: "skipped", detail: `already has active stripe subscription ${ss.id}` });
          skipped++;
          continue;
        }

        // b) Create new Stripe subscription
        const periodEndDate = sub.current_period_end
          ? sub.current_period_end.slice(0, 10)
          : new Date().toISOString().slice(0, 10);
        const idempotencyKey = `renewal-${sub.id}-${periodEndDate}`;

        const createParams: Stripe.SubscriptionCreateParams = {
          customer: customerId,
          items: [{ price: priceId }],
          payment_behavior: "allow_incomplete",
          proration_behavior: "none",
          metadata: { user_id: sub.user_id, migrated: "true", tier },
        };

        if (sub.lifetime_coupon) {
          createParams.coupon = sub.lifetime_coupon;
        }

        const newSub = await stripe.subscriptions.create(createParams, { idempotencyKey });

        const KNOWN_STATUSES = ["active","trialing","incomplete","past_due","incomplete_expired","canceled","unpaid","paused"];
        let newStatus = "active";
        if (newSub.status === "active" || newSub.status === "trialing") {
          newStatus = "active";
        } else if (newSub.status === "incomplete" || newSub.status === "past_due") {
          newStatus = "past_due";
        } else {
          newStatus = "past_due";
          if (!KNOWN_STATUSES.includes(newSub.status)) {
            await supabase.from("admin_alerts").insert({
              source: "stripe_unmapped_status",
              severity: "error",
              message: `Estado Stripe no mapeado al renovar: "${newSub.status}"`,
              context: { stripe_subscription_id: newSub.id, stripe_status: newSub.status, user_id: sub.user_id, email, tier },
            });
          }
        }

        const shouldAddCredits = newStatus === "active";

        const periodStart = newSub.current_period_start
          ? new Date(newSub.current_period_start * 1000).toISOString() : null;
        const periodEnd = newSub.current_period_end
          ? new Date(newSub.current_period_end * 1000).toISOString() : null;

        await supabase
          .from("subscriptions")
          .update({
            stripe_subscription_id: newSub.id,
            stripe_customer_id: customerId,
            current_period_start: periodStart,
            current_period_end: periodEnd,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sub.id);

        if (shouldAddCredits && tierCredits > 0) {
          // available_credits = créditos del plan (temporales, reset al periodo) + permanent_credits.
          // Los permanent_credits nunca se tocan: la suma garantiza que siempre están presentes.
          await supabase
            .from("profiles")
            .update({
              available_credits: totalCreditsAfterRenewal,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", sub.user_id);

          await supabase.from("credit_transactions").insert({
            user_id: sub.user_id,
            amount: tierCredits,
            type: "renewal",
            description: `Renovación: créditos suscripción reiniciados a ${tierCredits} (${tier}). Permanentes: ${permanentCredits}. Total: ${totalCreditsAfterRenewal}.`,
          });
        }

        await log({
          user_id: sub.user_id,
          email,
          action: "created",
          detail: `stripe sub ${newSub.id} status=${newSub.status} tier_credits=${tierCredits} permanent=${permanentCredits} total=${totalCreditsAfterRenewal} idempotency_key=${idempotencyKey}`,
        });
        created++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const isPM = /payment method|no.*source|invoice.*payment/i.test(msg);

        if (isPM) {
          await supabase.from("subscriptions").update({ status: "past_due", updated_at: new Date().toISOString() }).eq("id", sub.id);
          await log({ user_id: sub.user_id, email, action: "no_payment_method", detail: msg.slice(0, 500) });
          noPM++;
        } else {
          await log({ user_id: sub.user_id, email, action: "failed", detail: msg.slice(0, 500) });
          failed++;
        }
      }
    }

    if (dryRun) {
      return new Response(
        JSON.stringify({
          ok: true,
          dry_run: true,
          total: subs.length,
          would_renew: created,
          would_skip: skipped,
          results: dryRunResults,
          expired_cancelled: expiredCancelledCount,
          expired_cancelled_results: expiredCancelledResults,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        total: subs.length,
        created,
        skipped,
        no_payment_method: noPM,
        failed,
        expired_cancelled: expiredCancelledCount,
        expired_cancelled_failed: expiredCancelledFailed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[renewals] Fatal error:", msg);
    try {
      await supabase.from("admin_alerts").insert({
        source: "renewals_fatal",
        severity: "critical",
        message: "Fallo fatal en process-subscription-renewals",
        context: { error: msg.slice(0, 1000) },
      });
    } catch (_) { /* swallow */ }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
