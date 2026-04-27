import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

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
  sortOrder: number;
};

const PLAN_DEFINITIONS: PlanDefinition[] = [
  { planId: "annual_100", credits: 100, mode: "subscription", productType: "annual", billingInterval: "yearly", label: "Anual 100 créditos", sortOrder: 100 },
  { planId: "annual_200", credits: 200, mode: "subscription", productType: "annual", billingInterval: "yearly", label: "Anual 200 créditos", sortOrder: 200 },
  { planId: "annual_300", credits: 300, mode: "subscription", productType: "annual", billingInterval: "yearly", label: "Anual 300 créditos", sortOrder: 300 },
  { planId: "annual_500", credits: 500, mode: "subscription", productType: "annual", billingInterval: "yearly", label: "Anual 500 créditos", sortOrder: 500 },
  { planId: "annual_1000", credits: 1000, mode: "subscription", productType: "annual", billingInterval: "yearly", label: "Anual 1000 créditos", sortOrder: 1000 },
  { planId: "monthly", credits: 8, mode: "subscription", productType: "monthly", billingInterval: "monthly", label: "Mensual 8 créditos", sortOrder: 2000 },
  { planId: "individual", credits: 1, mode: "payment", productType: "single", billingInterval: null, label: "Crédito individual", sortOrder: 3000 },
  { planId: "topup_10", credits: 10, mode: "payment", productType: "topup", billingInterval: null, label: "Top-up 10 créditos", sortOrder: 4010 },
  { planId: "topup_25", credits: 25, mode: "payment", productType: "topup", billingInterval: null, label: "Top-up 25 créditos", sortOrder: 4025 },
  { planId: "topup_50", credits: 50, mode: "payment", productType: "topup", billingInterval: null, label: "Top-up 50 créditos", sortOrder: 4050 },
  { planId: "topup_100", credits: 100, mode: "payment", productType: "topup", billingInterval: null, label: "Top-up 100 créditos", sortOrder: 4100 },
  { planId: "topup_200", credits: 200, mode: "payment", productType: "topup", billingInterval: null, label: "Top-up 200 créditos", sortOrder: 4200 },
];

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
    searchableValues.some((value) => value === normalizedPlanId || value.includes(normalizedPlanId))
  );
}

function matchesDefinition(price: Stripe.Price, definition: PlanDefinition) {
  if (definition.mode === "subscription") {
    const expectedInterval = definition.billingInterval === "yearly" ? "year" : "month";
    if (price.type !== "recurring" || price.recurring?.interval !== expectedInterval) return false;
    if (metadataMatchesPlan(price, definition.planId)) return true;
    const inferredCredits = resolveCredits(price, definition);
    return inferredCredits === definition.credits;
  }
  if (price.type !== "one_time") return false;
  if (metadataMatchesPlan(price, definition.planId)) return true;
  const inferredCredits = resolveCredits(price, definition);
  return inferredCredits === definition.credits;
}

function resolveCredits(price: Stripe.Price, definition: PlanDefinition) {
  const productMetadata = getProductMetadata(price);
  const rawCredits = price.metadata.credits || productMetadata.credits;
  const parsedCredits = rawCredits ? Number.parseInt(rawCredits, 10) : Number.NaN;
  if (Number.isFinite(parsedCredits) && parsedCredits > 0) return parsedCredits;

  const inferredCredits = parseCreditsFromText(price.lookup_key, price.nickname, productName(price));
  return Number.isFinite(inferredCredits) && inferredCredits > 0 ? inferredCredits : definition.credits;
}

function formatMoney(unitAmount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(unitAmount / 100);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const url = new URL(req.url);
    const locale = typeof body.locale === "string" ? body.locale : url.searchParams.get("locale") || "es-ES";

    const prices = await stripe.prices.list({ active: true, limit: 100, expand: ["data.product"] });

    const plans = PLAN_DEFINITIONS.map((definition) => {
      const price = prices.data.find((candidate: Stripe.Price) => matchesDefinition(candidate, definition));
      if (!price || price.unit_amount === null) return null;

      const credits = resolveCredits(price, definition);
      const amount = price.unit_amount / 100;
      const pricePerCredit = credits > 0 ? amount / credits : null;

      return {
        planId: definition.planId,
        priceId: price.id,
        credits,
        mode: definition.mode,
        productType: definition.productType,
        billingInterval: definition.billingInterval,
        label: price.nickname || definition.label,
        currency: price.currency,
        unitAmount: price.unit_amount,
        amount,
        formattedPrice: formatMoney(price.unit_amount, price.currency, locale),
        pricePerCredit,
        formattedPricePerCredit: pricePerCredit === null ? null : formatMoney(Math.round(pricePerCredit * 100), price.currency, locale),
        sortOrder: definition.sortOrder,
      };
    }).filter((plan): plan is NonNullable<typeof plan> => plan !== null);

    return json({ plans, generatedAt: new Date().toISOString() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[STRIPE_PRICING_CATALOG] Error:", message);
    return json({ error: message }, 500);
  }
});
