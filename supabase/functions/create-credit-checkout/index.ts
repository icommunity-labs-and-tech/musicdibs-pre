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
  { planId: "annual_20", credits: 20, mode: "subscription", productType: "annual", billingInterval: "yearly", label: "Anual Básico 20 créditos" },
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

// Credit value used ONLY to decide upgrade vs downgrade direction when switching
// between subscription plans. Kept in sync with PLAN_DEFINITIONS credits.
const TIER_CREDITS: Record<string, number> = {
  annual_20: 20,
  annual_100: 100,
  annual_200: 200,
  annual_300: 300,
  annual_500: 500,
  annual_1000: 1000,
  monthly: 8,
};
const TIER_LABELS: Record<string, string> = {
  annual_20: "Anual Básico 20 créditos",
  annual_100: "Anual 100 créditos",
  annual_200: "Anual 200 créditos",
  annual_300: "Anual 300 créditos",
  annual_500: "Anual 500 créditos",
  annual_1000: "Anual 1000 créditos",
  monthly: "Mensual 8 créditos",
};

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

// Mapa explícito de price IDs de MusicDibs — evita colisiones con precios Enterprise
// Si se añaden nuevos planes, actualizar aquí.
// Mapa COMPLETO de price IDs de MusicDibs.
// IMPORTANTE: añadir aquí SIEMPRE que se cree un nuevo precio en Stripe.
// Sin esto, la búsqueda dinámica puede seleccionar precios de otros productos
// (Enterprise, YouTube, etc.) que coincidan por tipo/créditos.
const EXPLICIT_PRICE_IDS: Record<string, string> = {
  // Suscripciones anuales
  annual_20:   "price_1Tp90nFULeu7PzK67hoGodWv",
  annual_100:  "price_1T8n6CFULeu7PzK6vs7NZyiJ",
  annual_200:  "price_1TMapTFULeu7PzK640B5uuEq",
  annual_300:  "price_1TMapTFULeu7PzK6D4GnB3Il",
  annual_500:  "price_1TMapTFULeu7PzK6cNJMf2oL",
  annual_1000: "price_1TMapTFULeu7PzK6ziUW5fLn",
  // Suscripción mensual
  monthly:     "price_1T8n6lFULeu7PzK60TbO76hE",
  // Crédito individual
  individual:  "price_1TMDVkFULeu7PzK6aNdFYW91",
  // Top-ups (pago único) — sin esto, Stripe puede devolver precios de YouTube u otros
  topup_10:    "price_1TMDVkFULeu7PzK6YxaKfBiJ",
  topup_25:    "price_1TMDVkFULeu7PzK62A2zwaDO",
  topup_50:    "price_1TMDVkFULeu7PzK6PcMnQkWZ",
  topup_100:   "price_1TMDVkFULeu7PzK6AJC3o4lZ",
  topup_200:   "price_1TMDVkFULeu7PzK6e9omPpoB",
};

async function resolvePlan(stripe: Stripe, planId: string): Promise<ResolvedPlan> {
  const definition = PLAN_DEFINITIONS.find((plan) => plan.planId === planId);
  if (!definition) throw new Error(`Invalid plan: ${planId}`);

  // Si hay un price ID explícito, úsalo directamente — sin búsqueda dinámica.
  // Esto evita que precios Enterprise (o cualquier precio nuevo con mismo intervalo)
  // sean seleccionados antes que los precios correctos de MusicDibs.
  const explicitPriceId = EXPLICIT_PRICE_IDS[planId];
  if (explicitPriceId) {
    const price = await stripe.prices.retrieve(explicitPriceId, { expand: ["product"] });
    if (!price.active) throw new Error(`Price ${explicitPriceId} for plan ${planId} is not active`);
    return {
      ...definition,
      priceId: price.id,
      credits: resolveCredits(price, definition),
    };
  }

  // Fallback: búsqueda dinámica — SOLO entre precios con metadata.musicdibs_plan_id
  // para evitar colisiones con precios de otros productos (YouTube, Enterprise, etc.)
  const prices = await stripe.prices.list({ active: true, limit: 100, expand: ["data.product"] });
  const musicdibsPrices = prices.data.filter((p: Stripe.Price) =>
    p.metadata?.musicdibs_plan_id || p.lookup_key?.startsWith("annual") || p.lookup_key?.startsWith("topup") || p.lookup_key === "individual" || p.lookup_key === "monthly"
  );
  const price = musicdibsPrices.find((candidate: Stripe.Price) => matchesDefinition(candidate, definition));

  if (!price) {
    throw new Error(`No active Stripe price found for plan ${planId}. Add price ID to EXPLICIT_PRICE_IDS map or set Stripe price metadata.musicdibs_plan_id=${planId}.`);
  }

  return {
    ...definition,
    priceId: price.id,
    credits: resolveCredits(price, definition),
  };
}

// Uso general: localizar "la" suscripcion del cliente (para cancelar renovacion,
// para decidir si hay que hacer upgrade/downgrade, etc.) incluye estados con
// problemas de cobro porque en esos casos SI queremos encontrar la suscripcion
// (p.ej. para permitir que el usuario la arregle haciendo un cambio de plan).
function isSubscriptionActive(subscription: Stripe.Subscription) {
  return ["active", "trialing", "past_due", "unpaid"].includes(subscription.status);
}

// FIX (2026-07-08, caso andrerabinovici@gmail.com): comprobacion MAS ESTRICTA,
// usada UNICAMENTE como puerta de entrada para comprar top-ups. isSubscriptionActive
// (de arriba) trata 'past_due'/'unpaid' como "activa" -- correcto para localizar
// la suscripcion en otros contextos, pero PELIGROSO aqui: permitia que cualquier
// usuario cuya renovacion hubiera fallado (en periodo de gracia, con la suscripcion
// en past_due durante varios dias) siguiera comprando top-ups como si tuviera la
// suscripcion al dia -- exactamente el hueco que permitiria dejar de pagar la
// renovacion adrede y aprovechar el periodo de gracia para comprar creditos con
// el beneficio reservado a clientes al corriente de pago. Los top-ups exigen
// evidencia de pago genuinamente al dia: solo 'active' o 'trialing'.
function isSubscriptionGenuinelyPaidUp(subscription: Stripe.Subscription) {
  return ["active", "trialing"].includes(subscription.status);
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

    // NUEVO: cancelar un downgrade programado y volver a "seguir en el plan actual"
    if (action === "cancel_scheduled_downgrade") {
      if (!user) throw new Error("Authentication required");
      const { data: subRow } = await supabaseAdmin
        .from("subscriptions")
        .select("schedule_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!subRow?.schedule_id) {
        return json({ message: "No tienes ningún cambio de plan programado." });
      }
      try {
        await stripe.subscriptionSchedules.release(subRow.schedule_id);
      } catch (e) {
        console.warn("[CHECKOUT] release schedule on cancel:", e);
      }
      await supabaseAdmin.from("subscriptions").update({
        schedule_id: null,
        pending_price_id: null,
        pending_plan_id: null,
        pending_plan_label: null,
        pending_credits: null,
        pending_effective_at: null,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);
      return json({ message: "Cambio de plan programado cancelado. Seguirás en tu plan actual." });
    }

    const plan = await resolvePlan(stripe, planId);

    if (TOPUP_PLANS.includes(planId)) {
      if (!user) throw new Error("Top-ups require an active subscription. Please log in first.");
      const customers2 = await stripe.customers.list({ email: user.email, limit: 1 });
      if (!customers2.data.length) throw new Error("Top-ups require an active subscription. Please subscribe first.");

      const subs = await stripe.subscriptions.list({ customer: customers2.data[0].id, status: "all", limit: 10 });
      // FIX: exige suscripcion GENUINAMENTE al dia (active/trialing), no solo
      // "encontrable" (past_due/unpaid tambien cuentan para isSubscriptionActive).
      // Ver comentario en la definicion de isSubscriptionGenuinelyPaidUp.
      const activeSub = subs.data.find((subscription: Stripe.Subscription) => isSubscriptionGenuinelyPaidUp(subscription) && !subscription.cancel_at_period_end);
      if (!activeSub) throw new Error("Los top-ups de créditos requieren una suscripción activa y al día (sin problemas de cobro pendientes). Si tu renovación falló, actualiza tu método de pago antes de comprar créditos adicionales.");
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
        if (currentPriceId === plan.priceId && !activeSub.cancel_at_period_end && !activeSub.schedule) {
          return json({ already_subscribed: true, message: "Ya tienes este plan activo." });
        }
        if (currentPriceId === plan.priceId && activeSub.cancel_at_period_end) {
          await stripe.subscriptions.update(activeSub.id, { cancel_at_period_end: false });
          return json({ switched: true, reactivated: true, message: "Plan reactivado correctamente." });
        }

        // ─── Determinar si es upgrade o downgrade ───────────────────────────
        // Regla de negocio (estandar de la industria: Netflix, Spotify, la gran
        // mayoria de SaaS): los upgrades se aplican YA con prorrateo (el usuario
        // quiere el beneficio ya, es justo que pague por ello ya). Los downgrades
        // se PROGRAMAN para el final del periodo ya pagado, sin ningun tipo de
        // reembolso ni compensacion -- el usuario disfruta lo que ya pago hasta
        // el final, y el plan nuevo (mas barato) empieza a aplicarse solo en la
        // renovacion siguiente.
        const { data: profileRowForDirection } = await supabaseAdmin
          .from("profiles")
          .select("subscription_tier")
          .eq("user_id", user.id)
          .maybeSingle();
        const currentDbTier = profileRowForDirection?.subscription_tier as string | null | undefined;

        let currentCredits: number;
        if (currentDbTier && TIER_CREDITS[currentDbTier] !== undefined) {
          currentCredits = TIER_CREDITS[currentDbTier];
        } else {
          try {
            const currentPrice = currentPriceId ? await stripe.prices.retrieve(currentPriceId, { expand: ["product"] }) : null;
            const matchedCurrentDef = currentPrice ? PLAN_DEFINITIONS.find((d) => matchesDefinition(currentPrice, d)) : undefined;
            currentCredits = matchedCurrentDef ? resolveCredits(currentPrice!, matchedCurrentDef) : plan.credits;
          } catch {
            currentCredits = plan.credits;
          }
        }

        const isDowngrade = plan.credits < currentCredits;

        if (isDowngrade) {
          // ─── DOWNGRADE: programar para fin de periodo via Subscription Schedule ───
          try {
            // Si ya habia un downgrade programado, liberar el schedule anterior antes
            // de crear uno nuevo -- Stripe no permite tocar una sub adjunta a un
            // schedule sin liberarla primero, y el usuario puede haber cambiado de
            // opinion sobre a que plan bajar.
            if (activeSub.schedule) {
              const existingScheduleId = typeof activeSub.schedule === "string" ? activeSub.schedule : (activeSub.schedule as Stripe.SubscriptionSchedule).id;
              try {
                await stripe.subscriptionSchedules.release(existingScheduleId);
              } catch (releaseErr) {
                console.warn("[CHECKOUT] Could not release existing schedule (may already be released):", releaseErr);
              }
            }

            const schedule = await stripe.subscriptionSchedules.create({ from_subscription: activeSub.id });
            const currentPhaseStart = schedule.phases[0].start_date;
            const periodEndRaw =
              (activeSub as unknown as { current_period_end?: number }).current_period_end ??
              (activeSub.items.data[0] as unknown as { current_period_end?: number })?.current_period_end;
            if (!periodEndRaw) throw new Error("Could not resolve current_period_end for scheduling");

            await stripe.subscriptionSchedules.update(schedule.id, {
              end_behavior: "release",
              phases: [
                {
                  items: [{ price: currentPriceId!, quantity: 1 }],
                  start_date: currentPhaseStart,
                  end_date: periodEndRaw,
                },
                {
                  items: [{ price: plan.priceId, quantity: 1 }],
                },
              ],
            });

            const effectiveAtIso = new Date(periodEndRaw * 1000).toISOString();

            await supabaseAdmin.from("subscriptions").update({
              schedule_id: schedule.id,
              pending_price_id: plan.priceId,
              pending_plan_id: plan.planId,
              pending_plan_label: TIER_LABELS[plan.planId] ?? plan.label,
              pending_credits: plan.credits,
              pending_effective_at: effectiveAtIso,
              cancel_at_period_end: false,
              updated_at: new Date().toISOString(),
            }).eq("user_id", user.id);

            const effectiveDateHuman = new Date(periodEndRaw * 1000).toLocaleDateString("es-ES");

            return json({
              scheduled: true,
              message: `Tu plan actual seguirá activo hasta el ${effectiveDateHuman}. A partir de esa fecha pasarás automáticamente a ${plan.label}, sin ningún cargo ni compensación adicional.`,
              pending_plan: plan.planId,
              pending_credits: plan.credits,
              effective_at: effectiveAtIso,
            });
          } catch (scheduleErr) {
            const message = scheduleErr instanceof Error ? scheduleErr.message : "Unknown error";
            console.error("[CHECKOUT] Failed to schedule downgrade:", message);
            return json({ error: `No se pudo programar el cambio de plan: ${message}` }, 500);
          }
        }

        // ─── UPGRADE (o lateral): aplicar inmediatamente con prorrateo ───────
        // Si habia un downgrade programado y el usuario ahora sube de plan,
        // liberar el schedule primero (el upgrade inmediato sustituye cualquier
        // cambio futuro programado).
        if (activeSub.schedule) {
          const existingScheduleId = typeof activeSub.schedule === "string" ? activeSub.schedule : (activeSub.schedule as Stripe.SubscriptionSchedule).id;
          try {
            await stripe.subscriptionSchedules.release(existingScheduleId);
          } catch (releaseErr) {
            console.warn("[CHECKOUT] Could not release existing schedule before upgrade:", releaseErr);
          }
          await supabaseAdmin.from("subscriptions").update({
            schedule_id: null,
            pending_price_id: null,
            pending_plan_id: null,
            pending_plan_label: null,
            pending_credits: null,
            pending_effective_at: null,
            updated_at: new Date().toISOString(),
          }).eq("user_id", user.id);
        }

        await stripe.subscriptions.update(activeSub.id, {
          items: [{ id: activeSub.items.data[0].id, price: plan.priceId }],
          proration_behavior: "always_invoice",
          cancel_at_period_end: false,
        });

        // Wait for Stripe to settle and re-read actual subscription state.
        // Never trust the request payload — Stripe is the source of truth.
        await new Promise((r) => setTimeout(r, 500));
        const updatedSub = await stripe.subscriptions.retrieve(activeSub.id);
        const actualPriceId = updatedSub.items?.data?.[0]?.price?.id ?? plan.priceId;

        // Map actualPriceId → credits/plan via the same definitions used here.
        let actualCredits = plan.credits;
        let actualLabel = plan.label;
        let actualProductType = plan.productType;
        if (actualPriceId !== plan.priceId) {
          try {
            const actualPrice = await stripe.prices.retrieve(actualPriceId, { expand: ["product"] });
            const matchedDef = PLAN_DEFINITIONS.find((d) => matchesDefinition(actualPrice, d));
            if (matchedDef) {
              actualCredits = resolveCredits(actualPrice, matchedDef);
              actualLabel = matchedDef.label;
              actualProductType = matchedDef.productType;
            }
          } catch (e) {
            console.warn("[CHECKOUT] Could not resolve actual price, falling back to payload:", e);
          }
        }

        const actualPlanName = actualProductType === "annual" ? "Annual" : "Monthly";

        // ─── Tier-based credit resolution (DB is source of truth for migrated users) ───
        // Read subscription_tier + available_credits from profiles. If the user already
        // has a tier set in DB, that tier dictates credits — NOT the frontend planId
        // (which may be stale/wrong for migrated users whose Stripe price_ids don't
        // match the canonical live IDs).
        const { data: profileRow } = await supabaseAdmin
          .from("profiles")
          .select("subscription_tier, available_credits")
          .eq("user_id", user.id)
          .maybeSingle();

        const dbTier = profileRow?.subscription_tier as string | null | undefined;
        const dbCredits = Number(profileRow?.available_credits ?? 0);

        let resolvedCredits = actualCredits;
        let resolvedLabel = actualLabel;
        let resolvedPlanName = actualPlanName;
        let creditsSource: "subscription_tier" | "stripe_price" = "stripe_price";

        // FIX CRÍTICO (caso addiusfalcon55/ladydaymgs 2026-07-03): este fallback a
        // dbTier estaba pisando SIEMPRE el resultado ya resuelto correctamente desde
        // Stripe (actualPriceId), incluso cuando ese resultado era 100% correcto y
        // confiable (actualPriceId === plan.priceId, el plan que el usuario acaba de
        // solicitar). Efecto real: CUALQUIER cambio de plan revertia los creditos al
        // tier ANTERIOR en vez de aplicar el nuevo, porque el tier antiguo casi
        // siempre existe en TIER_CREDITS. El fallback a dbTier solo debe usarse
        // cuando la resolucion vía Stripe genuinamente fallo (matchedDef no
        // encontrado Y el precio no es el que se pidio explicitamente) — nunca
        // para sobrescribir una resolucion ya confirmada.
        const priceResolutionFailed = actualPriceId !== plan.priceId && actualCredits === plan.credits;
        if (priceResolutionFailed && dbTier && TIER_CREDITS[dbTier] !== undefined) {
          console.warn(`[CHECKOUT] actualPriceId resolution uncertain (${actualPriceId}), falling back to dbTier=${dbTier}`);
          resolvedCredits = TIER_CREDITS[dbTier];
          resolvedLabel = TIER_LABELS[dbTier] ?? resolvedLabel;
          resolvedPlanName = dbTier.startsWith("annual") ? "Annual" : "Monthly";
          creditsSource = "subscription_tier";
        }

        // ─── Guard: do NOT reset credits on a non-renewal trialing/past_due sub ───
        // If the user has 0 credits AND a tier set AND the Stripe sub is in trialing
        // or past_due (i.e. not actually renewed yet), this is NOT a real renewal —
        // credits should only be reset by stripe-webhook on billing_reason='subscription_cycle'.
        const subStatus = String(updatedSub.status ?? "");
        // Guard: never grant credits if Stripe sub is past_due or trialing —
        // real credit assignment happens via stripe-webhook on billing_reason=subscription_cycle.
        // NOTE: removed 'dbCredits === 0' condition (bug: users with credits > 0 were bypassing this guard)
        const shouldSkipCreditReset =
          !!dbTier &&
          (subStatus === "trialing" || subStatus === "past_due");

        console.log(
          `[CHECKOUT] credits resolved via: ${
            creditsSource === "subscription_tier" ? `subscription_tier=${dbTier}` : `stripe_price=${actualPriceId}`
          } → ${resolvedCredits} credits (subStatus=${subStatus}, dbCredits=${dbCredits}, skipReset=${shouldSkipCreditReset})`,
        );

        if (shouldSkipCreditReset) {
          // Update plan label only — preserve credits (will be set by webhook on real renewal).
          await supabaseAdmin.from("profiles").update({
            subscription_plan: resolvedPlanName,
            updated_at: new Date().toISOString(),
          }).eq("user_id", user.id);
        } else {
          await supabaseAdmin.from("profiles").update({
            subscription_plan: resolvedPlanName,
            available_credits: resolvedCredits,
            updated_at: new Date().toISOString(),
          }).eq("user_id", user.id);
        }

        // Persist the actual price id so the webhook can detect real plan changes.
        const periodStart = (updatedSub as any).current_period_start
          ? new Date((updatedSub as any).current_period_start * 1000).toISOString()
          : null;
        const periodEnd = (updatedSub as any).current_period_end
          ? new Date((updatedSub as any).current_period_end * 1000).toISOString()
          : null;
        await supabaseAdmin.from("subscriptions").upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: updatedSub.id,
          stripe_price_id: actualPriceId,
          plan: resolvedPlanName,
          status: "active",
          current_period_start: periodStart,
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        if (!shouldSkipCreditReset) {
          await supabaseAdmin.from("credit_transactions").insert({
            user_id: user.id,
            amount: resolvedCredits,
            type: "subscription",
            description: `Cambio de plan: ${resolvedLabel}`,
          });
        }

        // FIX: registrar el cambio de plan en el timeline probatorio (orders +
        // purchase_evidences). Este flujo NUNCA creaba estos registros — solo
        // tocaba credit_transactions/subscriptions — por eso los upgrades/downgrades
        // hechos desde aquí no aparecian en "Compras" ni se certificaban en IBS
        // (caso addiusfalcon55, upgrade a annual_20, 2026-07-03).
        try {
          let switchAmount = 0;
          let switchInvoiceId: string | undefined;
          const latestInvoiceId = (updatedSub as any).latest_invoice as string | undefined;
          if (latestInvoiceId) {
            switchInvoiceId = latestInvoiceId;
            try {
              const inv = await stripe.invoices.retrieve(latestInvoiceId);
              switchAmount = (inv.amount_paid ?? 0) / 100;
            } catch { /* seguir sin importe si falla */ }
          }
          const { data: switchOrder, error: switchOrderErr } = await supabaseAdmin
            .from("orders")
            .insert({
              user_id: user.id,
              stripe_customer_id: customerId,
              stripe_subscription_id: updatedSub.id,
              stripe_invoice_id: switchInvoiceId,
              stripe_price_id: actualPriceId,
              product_type: resolvedPlanName === "Annual" ? "annual" : "monthly",
              product_code: plan.planId,
              product_label: `Cambio de plan: ${resolvedLabel}`,
              billing_interval: resolvedPlanName === "Annual" ? "yearly" : "monthly",
              amount_gross: switchAmount,
              currency: "eur",
              is_subscription: true,
              is_renewal: false,
              paid_at: new Date().toISOString(),
            })
            .select("id")
            .single();
          if (switchOrderErr) {
            console.warn("[CHECKOUT] switch: failed to create order:", switchOrderErr.message);
          } else if (switchOrder) {
            const { data: switchProfile } = await supabaseAdmin
              .from("profiles").select("display_name").eq("user_id", user.id).single();
            const { data: evidence } = await supabaseAdmin
              .from("purchase_evidences")
              .insert({
                user_id: user.id,
                order_id: switchOrder.id,
                email: user.email,
                display_name: switchProfile?.display_name,
                product_type: resolvedPlanName === "Annual" ? "annual" : "monthly",
                product_name: `Cambio de plan: ${resolvedLabel}`,
                amount: switchAmount,
                currency: "eur",
                payment_provider: "stripe",
                payment_status: switchAmount > 0 ? "succeeded" : "pending",
                accepted_terms: false,
                certification_status: "pending",
              })
              .select("id")
              .single();
            // Disparar certificación IBS igual que hace el webhook para el resto de compras
            if (evidence?.id) {
              fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/certify-purchase`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
                body: JSON.stringify({ evidence_id: evidence.id }),
              }).catch(() => {});
            }
          }
        } catch (evErr) {
          console.warn("[CHECKOUT] switch: failed to create order/evidence:", evErr);
        }

        return json({
          switched: true,
          message: shouldSkipCreditReset
            ? `Plan actualizado a ${resolvedLabel}. Créditos se asignarán en la próxima renovación.`
            : `Plan cambiado a ${resolvedLabel}.`,
          plan: resolvedPlanName,
          credits: shouldSkipCreditReset ? dbCredits : resolvedCredits,
          credits_source: creditsSource,
          skipped_credit_reset: shouldSkipCreditReset,
        });
      }
    }

    const attrMetadata: Record<string, string> = {};
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "coupon_code", "referrer_code", "referrer", "landing_path", "attributed_campaign_name"]) {
      const value = attribution[key];
      if (typeof value === "string" && value.trim()) attrMetadata[key] = value.slice(0, 500);
    }

    const ALLOWED_ORIGINS = new Set(["https://musicdibs.com","https://www.musicdibs.com","https://aimusicdibs.com","https://www.aimusicdibs.com","https://musicdibs-pre.lovable.app"]);
    const rawOrigin = req.headers.get("origin") || "";
    const origin = ALLOWED_ORIGINS.has(rawOrigin) ? rawOrigin : "https://musicdibs.com";

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
      // `customer_creation` is only valid in `payment` mode. In `subscription` mode
      // Stripe always creates a customer automatically.
      if (plan.mode === "payment") {
        sessionParams.customer_creation = "always";
      }
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
