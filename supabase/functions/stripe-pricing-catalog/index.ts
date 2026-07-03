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
  { planId: "annual_20", credits: 20, mode: "subscription", productType: "annual", billingInterval: "yearly", label: "Anual Básico 20 créditos", sortOrder: 20 },
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
    searchableValues.some((value) => value === normalizedPlanId)
  );
}

function matchesDefinitionStrict(price: Stripe.Price, definition: PlanDefinition) {
  if (definition.mode === "subscription") {
    const expectedInterval = definition.billingInterval === "yearly" ? "year" : "month";
    if (price.type !== "recurring" || price.recurring?.interval !== expectedInterval) return false;
    return metadataMatchesPlan(price, definition.planId);
  }
  if (price.type !== "one_time") return false;
  return metadataMatchesPlan(price, definition.planId);
}

function matchesDefinitionLoose(price: Stripe.Price, definition: PlanDefinition) {
  if (definition.mode === "subscription") {
    const expectedInterval = definition.billingInterval === "yearly" ? "year" : "month";
    if (price.type !== "recurring" || price.recurring?.interval !== expectedInterval) return false;
  } else {
    if (price.type !== "one_time") return false;
  }
  const explicit = explicitCredits(price);
  return explicit !== null && explicit === definition.credits;
}

function explicitCredits(price: Stripe.Price): number | null {
  const productMetadata = getProductMetadata(price);
  const rawCredits = price.metadata.credits || productMetadata.credits;
  const parsedCredits = rawCredits ? Number.parseInt(rawCredits, 10) : Number.NaN;
  if (Number.isFinite(parsedCredits) && parsedCredits > 0) return parsedCredits;
  const inferredCredits = parseCreditsFromText(price.lookup_key, price.nickname, productName(price));
  return Number.isFinite(inferredCredits) && inferredCredits > 0 ? inferredCredits : null;
}

function resolveCredits(price: Stripe.Price, definition: PlanDefinition) {
  const explicit = explicitCredits(price);
  return explicit ?? definition.credits;
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

    // Assign each Stripe price to at most ONE plan definition.
    // First pass: strict matches (explicit metadata/lookup_key).
    // Second pass: loose matches by explicit credits count, skipping already-used prices.
    const usedPriceIds = new Set<string>();
    const matched = new Map<string, Stripe.Price>();

    for (const definition of PLAN_DEFINITIONS) {
      const price = prices.data.find(
        (c) => !usedPriceIds.has(c.id) && matchesDefinitionStrict(c, definition),
      );
      if (price) {
        matched.set(definition.planId, price);
        usedPriceIds.add(price.id);
      }
    }
    for (const definition of PLAN_DEFINITIONS) {
      if (matched.has(definition.planId)) continue;
      const price = prices.data.find(
        (c) => !usedPriceIds.has(c.id) && matchesDefinitionLoose(c, definition),
      );
      if (price) {
        matched.set(definition.planId, price);
        usedPriceIds.add(price.id);
      }
    }
    // Third pass: type/interval-only fallback for monthly + individual.
    const fallbackEligible = new Set(["monthly", "individual"]);
    for (const definition of PLAN_DEFINITIONS) {
      if (matched.has(definition.planId)) continue;
      if (!fallbackEligible.has(definition.planId)) continue;
      const expectedInterval = definition.billingInterval === "yearly" ? "year" : "month";
      const price = prices.data.find((c) => {
        if (usedPriceIds.has(c.id)) return false;
        if (definition.mode === "subscription") {
          return c.type === "recurring" && c.recurring?.interval === expectedInterval;
        }
        return c.type === "one_time";
      });
      if (price) {
        matched.set(definition.planId, price);
        usedPriceIds.add(price.id);
      }
    }

    // Fourth pass: annual tiers fallback when Stripe prices have no metadata.
    // Since the Stripe "Plan Anual" product has multiple prices distinguished
    // only by amount, sort the remaining yearly prices ASC by amount and
    // assign them to annual_100, annual_200, annual_300, annual_500, annual_1000
    // in that order (cheapest plan = fewest credits).
    const annualTiers = PLAN_DEFINITIONS.filter(
      (d) => d.productType === "annual" && !matched.has(d.planId),
    );
    if (annualTiers.length > 0) {
      const candidates = prices.data.filter(
        (p) =>
          !usedPriceIds.has(p.id) &&
          p.type === "recurring" &&
          p.recurring?.interval === "year" &&
          p.unit_amount !== null,
      );
      // Dedupe by unit_amount (keep first occurrence)
      const seenAmounts = new Set<number>();
      const uniqueByAmount = candidates.filter((p) => {
        const amt = p.unit_amount as number;
        if (seenAmounts.has(amt)) return false;
        seenAmounts.add(amt);
        return true;
      });
      // Sort DESC by amount, then keep the top N (most expensive ones,
      // ignoring legacy/test cheap prices), then sort ASC for assignment.
      const sortedDesc = [...uniqueByAmount].sort(
        (a, b) => (b.unit_amount ?? 0) - (a.unit_amount ?? 0),
      );
      const topN = sortedDesc.slice(0, annualTiers.length);
      const ascending = topN.sort((a, b) => (a.unit_amount ?? 0) - (b.unit_amount ?? 0));
      annualTiers.forEach((definition, idx) => {
        const price = ascending[idx];
        if (price) {
          matched.set(definition.planId, price);
          usedPriceIds.add(price.id);
        }
      });
    }


    const plans = PLAN_DEFINITIONS.map((definition) => {
      const price = matched.get(definition.planId);
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
