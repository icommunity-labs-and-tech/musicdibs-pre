import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PlanDefinition = {
  planId: string;
  credits: number;
  mode: "subscription" | "payment";
  productType: "annual" | "monthly" | "single" | "topup";
  billingInterval: "yearly" | "monthly" | null;
  label: string;
};

type ResolvedPlan = PlanDefinition & {
  priceId: string;
  credits: number;
};

const PLAN_DEFINITIONS: PlanDefinition[] = [
  { planId: "annual_100", credits: 100, mode: "subscription", productType: "annual", billingInterval: "yearly", label: "Anual 100 créditos" },
  { planId: "annual_200", credits: 200, mode: "subscription", productType: "annual", billingInterval: "yearly", label: "Anual 200 créditos" },
  { planId: "annual_300", credits: 300, mode: "subscription", productType: "annual", billingInterval: "yearly", label: "Anual 300 créditos" },
  { planId: "annual_500", credits: 500, mode: "subscription", productType: "annual", billingInterval: "yearly", label: "Anual 500 créditos" },
  { planId: "annual_1000", credits: 1000, mode: "subscription", productType: "annual", billingInterval: "yearly", label: "Anual 1000 créditos" },
  { planId: "monthly", credits: 8, mode: "subscription", productType: "monthly", billingInterval: "monthly", label: "Mensual 8 créditos" },
  { planId: "individual", credits: 1, mode: "payment", productType: "single", billingInterval: null, label: "Crédito individual" },
  { planId: "topup_10", credits: 10, mode: "payment", productType: "topup", billingInterval: null, label: "Top-up 10 créditos" },
  { planId: "topup_25", credits: 25, mode: "payment", productType: "topup", billingInterval: null, label: "Top-up 25 créditos" },
  { planId: "topup_50", credits: 50, mode: "payment", productType: "topup", billingInterval: null, label: "Top-up 50 créditos" },
  { planId: "topup_100", credits: 100, mode: "payment", productType: "topup", billingInterval: null, label: "Top-up 100 créditos" },
  { planId: "topup_200", credits: 200, mode: "payment", productType: "topup", billingInterval: null, label: "Top-up 200 créditos" },
];

const TOPUP_PLANS = PLAN_DEFINITIONS.filter((plan) => plan.productType === "topup").map((plan) => plan.planId);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getProductMetadata(price: Stripe.Price): Stripe.Metadata {
  return typeof price.product === "object" && price.product && "metadata" in price.product
    ? price.product.metadata
    : {};
}

function normalize(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\s-]+/g, " ")
    .trim();
}

function productName(price: Stripe.Price) {
  return typeof price.product === "object" && price.product && "name" in price.product
    ? price.product.name
    : "";
}

function parseCreditsFromText(...values: unknown[]) {
  const text = normalize(values.filter(Boolean).join(" "));
  const match = text.match(/(?:^|\s)(\d{1,5})(?:\s)*(?:credit|credito|creditos|cr\b)/i);
  return match ? Number.parseInt(match[1], 10) : Number.NaN;
}

function metadataMatchesPlan(price: Stripe.Price, planId: string) {
  const productMetadata = getProductMetadata(price);
  const normalizedPlanId = normalize(planId);
  const searchableValues = [
    price.lookup_key,
    price.nickname,
    productName(price),
    price.metadata.plan_id,
    price.metadata.planId,
    price.metadata.musicdibs_plan_id,
    productMetadata.plan_id,
    productMetadata.planId,
    productMetadata.musicdibs_plan_id,
  ].map(normalize);

  return (
    price.lookup_key === planId ||
    price.metadata.plan_id === planId ||
    price.metadata.planId === planId ||
    price.metadata.musicdibs_plan_id === planId ||
    productMetadata.plan_id === planId ||
    productMetadata.planId === planId ||
    productMetadata.musicdibs_plan_id === planId ||
    searchableValues.some((value) => value === normalizedPlanId)
  );
}

function matchesDefinition(price: Stripe.Price, definition: PlanDefinition) {
  if (definition.mode === "subscription") {
    const expectedInterval = definition.billingInterval === "yearly" ? "year" : "month";
    if (price.type !== "recurring" || price.recurring?.interval !== expectedInterval) return false;
    if (metadataMatchesPlan(price, definition.planId)) return true;
    return resolveCredits(price, definition) === definition.credits;
  }
  if (price.type !== "one_time") return false;
  if (metadataMatchesPlan(price, definition.planId)) return true;
  return resolveCredits(price, definition) === definition.credits;
}

function resolveCredits(price: Stripe.Price, definition: PlanDefinition) {
  const productMetadata = getProductMetadata(price);
  const rawCredits = price.metadata.credits || productMetadata.credits;
  const parsedCredits = rawCredits ? Number.parseInt(rawCredits, 10) : Number.NaN;
  if (Number.isFinite(parsedCredits) && parsedCredits > 0) return parsedCredits;
  const inferredCredits = parseCreditsFromText(price.lookup_key, price.nickname, productName(price));
  return Number.isFinite(inferredCredits) && inferredCredits > 0 ? inferredCredits : definition.credits;
}

async function resolvePlan(stripe: Stripe, planId: string): Promise<ResolvedPlan> {
  const definition = PLAN_DEFINITIONS.find((plan) => plan.planId === planId);
  if (!definition) throw new Error(`Invalid plan: ${planId}`);

  const prices = await stripe.prices.list({ active: true, limit: 100, expand: ["data.product"] });
  const price = prices.data.find((candidate: Stripe.Price) => matchesDefinition(candidate, definition));

  if (!price) {
    throw new Error(`No active Stripe price found for plan ${planId}. Set Stripe price lookup_key or metadata plan_id to ${planId}.`);
  }

  return {
    ...definition,
    priceId: price.id,
    credits: resolveCredits(price, definition),
  };
}

function isSubscriptionActive(subscription: Stripe.Subscription) {
  return ["active", "trialing", "past_due", "unpaid"].includes(subscription.status);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
  const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });

  try {
    const body = await req.json();
    const planId = typeof body.planId === "string" ? body.planId : "";
    const action = typeof body.action === "string" ? body.action : undefined;
    const isGuest = body.guest === true;
    const guestEmail = typeof body.guestEmail === "string" ? body.guestEmail.trim().toLowerCase() : "";
    const attribution = typeof body.attribution === "object" && body.attribution !== null ? body.attribution as Record<string, unknown> : {};

    let user: { id: string; email: string } | null = null;

    if (!isGuest) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Missing Authorization header");
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      const authUser = data.user;
      if (!authUser?.email) throw new Error("User not authenticated");
      user = { id: authUser.id, email: authUser.email };
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    if (action === "cancel_renewal") {
      if (!user) throw new Error("Authentication required");

      // 1) Intentar cancelar en Stripe si existe el cliente y una sub activa
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length) {
        const subs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: "all", limit: 10 });
        const activeSub = subs.data.find((subscription: Stripe.Subscription) => isSubscriptionActive(subscription));
        if (activeSub) {
          if (activeSub.cancel_at_period_end) {
            // Reflejar también localmente por si está desincronizado
            await supabaseAdmin.from("subscriptions")
              .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
              .eq("user_id", user.id).eq("status", "active");
            return json({ message: "La renovación ya está cancelada." });
          }
          await stripe.subscriptions.update(activeSub.id, { cancel_at_period_end: true });
          await supabaseAdmin.from("subscriptions")
            .update({ cancel_at_period_end: true, canceled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq("user_id", user.id).eq("status", "active");
          return json({ message: "Renovación cancelada. Tu plan seguirá activo hasta fin de periodo." });
        }
      }

      // 2) Sin sub activa en Stripe → buscar suscripción local vigente (usuarios migrados)
      const { data: localSub } = await supabaseAdmin
        .from("subscriptions")
        .select("id, cancel_at_period_end, current_period_end")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gte("current_period_end", new Date().toISOString())
        .maybeSingle();

      if (!localSub) throw new Error("No active subscription");

      if (localSub.cancel_at_period_end) {
        return json({ message: "La renovación ya está cancelada." });
      }

      const { error: updErr } = await supabaseAdmin
        .from("subscriptions")
        .update({ cancel_at_period_end: true, canceled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", localSub.id);
      if (updErr) throw new Error(`Failed to cancel local subscription: ${updErr.message}`);

      return json({ message: "Renovación cancelada. Tu plan seguirá activo hasta fin de periodo." });
    }

    const plan = await resolvePlan(stripe, planId);

    if (TOPUP_PLANS.includes(planId)) {
      if (!user) throw new Error("Top-ups require an active subscription. Please log in first.");
      const customers2 = await stripe.customers.list({ email: user.email, limit: 1 });
      if (!customers2.data.length) throw new Error("Top-ups require an active subscription. Please subscribe first.");

      const subs = await stripe.subscriptions.list({ customer: customers2.data[0].id, status: "all", limit: 10 });
      const activeSub = subs.data.find((subscription: Stripe.Subscription) => isSubscriptionActive(subscription) && !subscription.cancel_at_period_end);
      if (!activeSub) throw new Error("Top-ups require an active subscription. Please subscribe first.");
    }

    let customerId: string | undefined;
    if (user) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      customerId = customers.data[0]?.id;
      if (!customerId) {
        const customer = await stripe.customers.create({ email: user.email, metadata: { supabase_user_id: user.id } });
        customerId = customer.id;
      }
    }

    if (plan.mode === "subscription" && customerId && user) {
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 });
      const activeSub = subs.data.find((subscription: Stripe.Subscription) => isSubscriptionActive(subscription));

      if (activeSub) {
        const currentPriceId = activeSub.items.data[0]?.price?.id;
        if (currentPriceId === plan.priceId && !activeSub.cancel_at_period_end) {
          return json({ already_subscribed: true, message: "Ya tienes este plan activo." });
        }
        if (currentPriceId === plan.priceId && activeSub.cancel_at_period_end) {
          await stripe.subscriptions.update(activeSub.id, { cancel_at_period_end: false });
          return json({ switched: true, reactivated: true, message: "Plan reactivado correctamente." });
        }

        await stripe.subscriptions.update(activeSub.id, {
          items: [{ id: activeSub.items.data[0].id, price: plan.priceId }],
          proration_behavior: "always_invoice",
          cancel_at_period_end: false,
        });

        await supabaseAdmin.from("profiles").update({
          subscription_plan: plan.productType === "annual" ? "Annual" : "Monthly",
          available_credits: plan.credits,
          updated_at: new Date().toISOString(),
        }).eq("user_id", user.id);
        await supabaseAdmin.from("credit_transactions").insert({
          user_id: user.id,
          amount: plan.credits,
          type: "subscription",
          description: `Cambio de plan: ${plan.label}`,
        });
        return json({ switched: true, message: `Plan cambiado a ${plan.label}.` });
      }
    }

    const attrMetadata: Record<string, string> = {};
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "coupon_code", "referrer_code", "referrer", "landing_path", "attributed_campaign_name"]) {
      const value = attribution[key];
      if (typeof value === "string" && value.trim()) attrMetadata[key] = value.slice(0, 500);
    }

    const origin = req.headers.get("origin") || "https://musicdibs.com";
    const successUrl = isGuest
      ? `${origin}/auth/payment-success?session_id={CHECKOUT_SESSION_ID}`
      : `${origin}/dashboard/credits?payment=success&session_id={CHECKOUT_SESSION_ID}`;
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: plan.mode,
      success_url: successUrl,
      cancel_url: `${origin}/dashboard/credits?payment=cancelled`,
      metadata: {
        user_id: user?.id ?? "",
        guest: user ? "false" : "true",
        plan_id: planId,
        credits: String(plan.credits),
        product_type: plan.productType,
        product_code: planId,
        product_label: plan.label,
        billing_interval: plan.billingInterval ?? "",
        ...attrMetadata,
      },
      line_items: [{ price: plan.priceId, quantity: 1 }],
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      consent_collection: { terms_of_service: "required" },
      custom_text: {
        terms_of_service_acceptance: {
          message: "Acepto los [Términos y Condiciones](https://musicdibs.com/terms) y la [Política de Privacidad](https://musicdibs.com/privacy) de MusicDibs.",
        },
      },
    };

    if (customerId) {
      sessionParams.customer = customerId;
      sessionParams.customer_update = { name: "auto", address: "auto" };
    } else {
      sessionParams.customer_creation = "always";
      if (isGuest && guestEmail) {
        sessionParams.customer_email = guestEmail;
        sessionParams.metadata!.guest_email = guestEmail;
      }
    }

    if (plan.mode === "payment") {
      sessionParams.invoice_creation = { enabled: true };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    console.log(`[CHECKOUT] Created session for ${planId} (guest=${!user}): ${session.id}`);

    const checkoutUrl = session.url?.replace("https://checkout.musicdibs.com", "https://checkout.stripe.com") ?? session.url;
    const resolvedCustomerId = session.customer as string | undefined;
    if (resolvedCustomerId && user?.id) {
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: resolvedCustomerId })
        .eq("user_id", user.id)
        .is("stripe_customer_id", null);
    }

    return json({ url: checkoutUrl });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[CHECKOUT] Error:", message);
    return json({ error: message }, 500);
  }
});
