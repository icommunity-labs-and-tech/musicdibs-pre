import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "../_shared/supabase-client.ts";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";
import { creditPurchaseEmail, paymentFailedEmail, distributionWelcomeEmail } from "../_shared/transactional-email.ts";
import { netFromInvoice, netFromSession } from "../_shared/stripe-net.ts";


// ââ MailerLite sync helper ââââââââââââââââââââââââââââââââââââââââââââââââ
async function syncMailerLite(event: string, payload: Record<string, unknown>) {
  try {
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mailerlite-webhook-handler`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ event, ...payload }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.warn(`[ML-SYNC] ${event} failed ${res.status}: ${txt}`);
    } else {
      await res.text();
      console.log(`[ML-SYNC] â ${event}`);
    }
  } catch (e) {
    console.warn(`[ML-SYNC] ${event} error:`, e);
  }
}

function planToMailerLiteType(plan: string | undefined): string {
  if (!plan) return "single";
  const p = plan.toLowerCase();
  if (p.includes("annual") || p.includes("anual")) return "anuales";
  if (p.includes("month") || p.includes("mensual")) return "mensuales";
  return "single";
}

const PRICE_CREDITS: Record<string, number> = {
  // FIX 2026-07-17: price IDs ACTIVOS actualmente en Stripe (cuenta FULeu7PzK6).
  // Root cause de persistencia de subscriptions sin resolver desde sesiones previas:
  // este mapa solo tenia los price IDs legacy (prefijo F9ZCIiqrz6, ya INACTIVOS en
  // Stripe) para annual_200/300/500/1000. Si session.metadata.credits venia vacio
  // (checkout sin metadata completa), el Fallback B buscaba PRICE_CREDITS[priceId]
  // con el price ID real (FULeu7PzK6...), no lo encontraba, credits quedaba en 0,
  // y el bloque completo `if (userId && credits > 0)` -- incluyendo el upsert a
  // subscriptions -- se saltaba entero, en silencio (solo console.warn).
  // Verificado contra Stripe en vivo (stripe.prices.list) el 2026-07-17.
  "price_1TMapTFULeu7PzK640B5uuEq": 200,  // annual_200 (ACTIVO)
  "price_1TMapTFULeu7PzK6D4GnB3Il": 300,  // annual_300 (ACTIVO)
  "price_1TMapTFULeu7PzK6cNJMf2oL": 500,  // annual_500 (ACTIVO)
  "price_1TMapTFULeu7PzK6ziUW5fLn": 1000, // annual_1000 (ACTIVO)
  "price_1Tp90nFULeu7PzK67hoGodWv": 20,
  "price_1T9TnyF9ZCIiqrz6ruOlBcnZ": 120,
  // Legacy prices (cuenta F9ZCIiqrz6, verificar si siguen activos antes de asumirlo)
  "price_1THT7cF9ZCIiqrz6sWS67Q4V": 100,
  "price_1THT7gF9ZCIiqrz6Acb2CkDC": 200,
  "price_1THT7jF9ZCIiqrz6i02J4bj4": 300,
  "price_1THT7nF9ZCIiqrz6r1ZcqH8L": 500,
  "price_1THT7rF9ZCIiqrz6UmJDkBNZ": 1000,
  "price_1T9SZvF9ZCIiqrz6TWLtfMBs": 8,
  "price_1THULsF9ZCIiqrz64SbA3AK6": 1,
  "price_1THT7xF9ZCIiqrz60FfiGbfv": 10,
  "price_1THT80F9ZCIiqrz6H31dYDMG": 25,
  "price_1THT83F9ZCIiqrz6BD2wmUaO": 50,
  "price_1THT86F9ZCIiqrz6C548DJnT": 100,
  "price_1THT8AF9ZCIiqrz626wSH9Rz": 200,
  "price_1T8n6CFULeu7PzK6vs7NZyiJ": 100, // annual_100 legacy
  "price_1T8n6lFULeu7PzK60TbO76hE": 8,   // monthly legacy
  // Top-up legacy prices (FULeu7PzK6 account)
  "price_1TMDVkFULeu7PzK6aNdFYW91": 1,   // individual
  "price_1TMDVkFULeu7PzK6YxaKfBiJ": 10,  // topup_10
  "price_1TMDVkFULeu7PzK62A2zwaDO": 25,  // topup_25
  "price_1TMDVkFULeu7PzK6PcMnQkWZ": 50,  // topup_50
  "price_1TMDVkFULeu7PzK6AJC3o4lZ": 100, // topup_100
  "price_1TMDVkFULeu7PzK6e9omPpoB": 200, // topup_200
};

const TIER_CREDITS: Record<string, number> = {
  annual_20: 20,
  annual_100: 100,
  annual_200: 200,
  annual_300: 300,
  annual_500: 500,
  annual_1000: 1000,
  monthly: 8,
};

async function resolveCreditsForUser(
  supabase: any,
  userId: string,
  priceId: string | null | undefined,
): Promise<{ credits: number; source: "tier" | "price" | "none"; tier: string | null }> {
  const { data: prof } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("user_id", userId)
    .maybeSingle();
  const tier = prof?.subscription_tier ?? null;
  if (tier && TIER_CREDITS[tier] != null) {
    return { credits: TIER_CREDITS[tier], source: "tier", tier };
  }
  const fallback = priceId ? (PRICE_CREDITS[priceId] || 0) : 0;
  return { credits: fallback, source: fallback > 0 ? "price" : "none", tier };
}

const PRICE_PLAN: Record<string, string> = {
  "price_1T9TnyF9ZCIiqrz6ruOlBcnZ": "Annual",
  "price_1THT7cF9ZCIiqrz6sWS67Q4V": "Annual",
  "price_1THT7gF9ZCIiqrz6Acb2CkDC": "Annual",
  "price_1THT7jF9ZCIiqrz6i02J4bj4": "Annual",
  "price_1THT7nF9ZCIiqrz6r1ZcqH8L": "Annual",
  "price_1THT7rF9ZCIiqrz6UmJDkBNZ": "Annual",
  "price_1T9SZvF9ZCIiqrz6TWLtfMBs": "Monthly",
  "price_1T8n6CFULeu7PzK6vs7NZyiJ": "Annual",
  "price_1T8n6lFULeu7PzK60TbO76hE": "Monthly",
};

const PRICE_TO_PLAN_ID: Record<string, string> = {
  "price_1T9TnyF9ZCIiqrz6ruOlBcnZ": "annual_legacy",
  "price_1THT7cF9ZCIiqrz6sWS67Q4V": "annual_100",
  "price_1THT7gF9ZCIiqrz6Acb2CkDC": "annual_200",
  "price_1THT7jF9ZCIiqrz6i02J4bj4": "annual_300",
  "price_1THT7nF9ZCIiqrz6r1ZcqH8L": "annual_500",
  "price_1THT7rF9ZCIiqrz6UmJDkBNZ": "annual_1000",
  "price_1T9SZvF9ZCIiqrz6TWLtfMBs": "monthly",
  "price_1THULsF9ZCIiqrz64SbA3AK6": "individual",
  "price_1THT7xF9ZCIiqrz60FfiGbfv": "topup_10",
  "price_1THT80F9ZCIiqrz6H31dYDMG": "topup_25",
  "price_1THT83F9ZCIiqrz6BD2wmUaO": "topup_50",
  "price_1THT86F9ZCIiqrz6C548DJnT": "topup_100",
  "price_1THT8AF9ZCIiqrz626wSH9Rz": "topup_200",
  "price_1T8n6CFULeu7PzK6vs7NZyiJ": "annual_100",
  "price_1T8n6lFULeu7PzK60TbO76hE": "monthly",
  //  Live production prices (FULeu7PzK6 annual plans) 
  "price_1TMDVwFULeu7PzK6laW4n6wu": "annual_100",
  "price_1TMDVwFULeu7PzK6ZnMqrW1c": "annual_200",
  "price_1TMDVwFULeu7PzK6S22WkY3w": "annual_300",
  "price_1TMDVwFULeu7PzK6mSwmx29Z": "annual_500",
  "price_1TMDVwFULeu7PzK68TlUbof2": "annual_1000",
  "price_1TMDW3FULeu7PzK6468wsXJt": "monthly",
  //  Top-up legacy prices (FULeu7PzK6 account) 
  "price_1TMDVkFULeu7PzK6aNdFYW91": "individual",
  "price_1TMDVkFULeu7PzK6YxaKfBiJ": "topup_10",
  "price_1TMDVkFULeu7PzK62A2zwaDO": "topup_25",
  "price_1TMDVkFULeu7PzK6PcMnQkWZ": "topup_50",
  "price_1TMDVkFULeu7PzK6AJC3o4lZ": "topup_100",
  "price_1TMDVkFULeu7PzK6e9omPpoB": "topup_200",
  // Anual Básico — tier intermedio LATAM (2026-07)
  "price_1Tp90nFULeu7PzK67hoGodWv": "annual_20",
  // FIX 2026-07-17: price IDs REALMENTE activos en Stripe hoy (verificado via
  // stripe.prices.list). Los de arriba con prefijo TMDVw pueden estar obsoletos.
  "price_1TMapTFULeu7PzK640B5uuEq": "annual_200",
  "price_1TMapTFULeu7PzK6D4GnB3Il": "annual_300",
  "price_1TMapTFULeu7PzK6cNJMf2oL": "annual_500",
  "price_1TMapTFULeu7PzK6ziUW5fLn": "annual_1000",
};

const PLAN_ID_TO_PLAN_NAME: Record<string, string> = {
  annual_20: "Annual", annual_100: "Annual", annual_200: "Annual", annual_300: "Annual",
  annual_500: "Annual", annual_1000: "Annual", monthly: "Monthly",
  annual_legacy: "Annual",
};

function getProductType(planId: string): string {
  if (planId.startsWith("annual")) return "annual";
  if (planId === "monthly") return "monthly";
  if (planId === "individual") return "single";
  if (planId.startsWith("topup_")) return "topup";
  return "unknown";
}

function mapStripeStatus(stripeStatus: string): string {
  if (["active", "trialing"].includes(stripeStatus)) return "active";
  if (["past_due", "unpaid"].includes(stripeStatus)) return "past_due";
  if (["canceled", "incomplete_expired"].includes(stripeStatus)) return "cancelled";
  return "past_due";
}

async function findProfileByCustomerId(
  supabase: any, stripe: any, customerId: string,
): Promise<{ user_id: string; available_credits: number } | null> {
  const { data: profile } = await supabase
    .from("profiles").select("user_id, available_credits")
    .eq("stripe_customer_id", customerId).single();
  if (profile) return profile;

  console.warn(`[WEBHOOK] No profile for customer ${customerId} — trying email fallback`);
  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
  if (customer.email) {
    const { data: authUser } = await supabase.auth.admin.getUserByEmail(customer.email);
    if (authUser?.user) {
      await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("user_id", authUser.user.id);
      const { data: p } = await supabase.from("profiles").select("user_id, available_credits").eq("user_id", authUser.user.id).single();
      return p;
    }
  }
  return null;
}

function getInvoiceCustomerId(invoice: any): string {
  return typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? "";
}

function getInvoicePriceId(invoice: any): string | undefined {
  return invoice.lines?.data?.[0]?.price?.id;
}

// For subscription_update invoices, the first line item is the proration credit
// for the OLD plan. We need the NEW plan's price from the subscription itself.
async function getSubscriptionPriceId(stripe: any, subscriptionId: string): Promise<string | undefined> {
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    return sub.items?.data?.[0]?.price?.id;
  } catch (e) {
    console.warn("[WEBHOOK] Failed to retrieve subscription for price:", e);
    return undefined;
  }
}

// ââ Get Stripe fee (in EUR) from a charge — never throws ââ
async function getStripeFee(stripe: any, chargeId?: string | null): Promise<number> {
  if (!chargeId) return 0;
  try {
    const charge = await stripe.charges.retrieve(chargeId, { expand: ["balance_transaction"] });
    const bt = charge?.balance_transaction;
    if (bt && typeof bt === "object" && typeof bt.fee === "number") {
      return bt.fee / 100;
    }
    return 0;
  } catch (err) {
    console.warn(`[WEBHOOK] getStripeFee failed for charge ${chargeId}:`, (err as any)?.message || err);
    return 0;
  }
}

// ââ Create order record in orders table ââ
async function createOrderRecord(
  supabase: any,
  params: {
    userId: string;
    stripeCheckoutSessionId?: string;
    stripeInvoiceId?: string;
    stripePaymentIntentId?: string;
    stripeChargeId?: string;
    stripeSubscriptionId?: string;
    productType: string;
    productCode: string;
    productLabel: string;
    billingInterval: string | null;
    amountGross: number;
    amountNet?: number;
    stripeFee?: number;
    currency: string;
    isSubscription: boolean;
    isRenewal: boolean;
    stripeCustomerId?: string;
    couponCode?: string;
    promotionCode?: string;
    metadata?: Record<string, any>;
    paidAt?: string;
    orderStatus?: string;
  }
) {
  try {
    // Check if this is the first purchase for this user
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", params.userId);
    const isFirstPurchase = (count || 0) === 0;

    // Extract UTM data from metadata
    const meta = params.metadata || {};

    // Try to match a campaign
    let campaignId: string | null = null;
    let attributedCampaignName: string | null = meta.attributed_campaign_name || null;

    // Try matching by utm_campaign, coupon_code, or attributed_campaign_name
    const matchField = meta.utm_campaign || params.couponCode || attributedCampaignName;
    if (matchField) {
      let q = supabase.from("marketing_campaigns").select("id, name");
      // Try utm_campaign match first
      if (meta.utm_campaign) {
        const { data: camp } = await q.eq("utm_campaign", meta.utm_campaign).limit(1).maybeSingle();
        if (camp) { campaignId = camp.id; attributedCampaignName = camp.name; }
      }
      // Fallback: coupon match
      if (!campaignId && params.couponCode) {
        const { data: camp } = await supabase.from("marketing_campaigns").select("id, name").eq("coupon_code", params.couponCode).limit(1).maybeSingle();
        if (camp) { campaignId = camp.id; attributedCampaignName = camp.name; }
      }
    }

    const orderData = {
      user_id: params.userId,
      stripe_checkout_session_id: params.stripeCheckoutSessionId || null,
      stripe_invoice_id: params.stripeInvoiceId || null,
      stripe_payment_intent_id: params.stripePaymentIntentId || null,
      stripe_charge_id: params.stripeChargeId || null,
      stripe_subscription_id: params.stripeSubscriptionId || null,
      product_type: params.productType,
      product_code: params.productCode,
      product_label: params.productLabel,
      billing_interval: params.billingInterval,
      quantity: 1,
      amount_gross: params.amountGross,
      amount_net: params.amountNet || null,
      stripe_fee: params.stripeFee || 0,
      currency: params.currency,
      is_subscription: params.isSubscription,
      is_renewal: params.isRenewal,
      stripe_customer_id: params.stripeCustomerId || null,
      is_first_purchase: isFirstPurchase,
      coupon_code: params.couponCode || null,
      promotion_code: params.promotionCode || null,
      campaign_id: campaignId,
      attributed_campaign_name: attributedCampaignName,
      utm_source: meta.utm_source || null,
      utm_medium: meta.utm_medium || null,
      utm_campaign: meta.utm_campaign || null,
      utm_content: meta.utm_content || null,
      utm_term: meta.utm_term || null,
      referrer: meta.referrer || null,
      landing_path: meta.landing_path || null,
      metadata: meta,
      paid_at: params.paidAt || new Date().toISOString(),
      order_status: params.orderStatus || "paid",
    };

    const { data: order, error } = await supabase.from("orders").insert(orderData).select("id").single();
    if (error) {
      console.error("[WEBHOOK] Failed to create order:", error.message);
      return null;
    }

    // Create order_attribution record
    if (order) {
      await supabase.from("order_attribution").insert({
        order_id: order.id,
        campaign_id: campaignId,
        attributed_campaign_name: attributedCampaignName,
        source: meta.utm_source || null,
        medium: meta.utm_medium || null,
        campaign: meta.utm_campaign || null,
        content: meta.utm_content || null,
        coupon_code: params.couponCode || null,
      });
    }

    console.log(`[WEBHOOK] â Order created: ${order?.id} (first_purchase=${isFirstPurchase}, renewal=${params.isRenewal})`);
    return order;
  } catch (err: any) {
    console.error("[WEBHOOK] Error creating order:", err.message);
    return null;
  }
}

// ââ Create purchase evidence record ââ
async function createPurchaseEvidence(
  supabase: any,
  params: {
    userId: string;
    orderId?: string;
    email?: string;
    displayName?: string;
    productType: string;
    productName?: string;
    amount: number;
    currency: string;
    paymentIntentId?: string;
    chargeId?: string;
    checkoutSessionId?: string;
    paymentStatus?: string;
    ipAddress?: string;
    userAgent?: string;
    browserLanguage?: string;
    sessionId?: string;
    acceptedTerms?: boolean;
    acceptedTermsVersion?: string;
    acceptedTermsTimestamp?: string;
  }
) {
  try {
    const payload = {
      user_id: params.userId,
      email: params.email,
      display_name: params.displayName,
      product_type: params.productType,
      product_name: params.productName,
      amount: params.amount,
      currency: params.currency,
      payment_provider: "stripe",
      payment_intent_id: params.paymentIntentId,
      charge_id: params.chargeId,
      checkout_session_id: params.checkoutSessionId,
      payment_status: params.paymentStatus || "succeeded",
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
      browser_language: params.browserLanguage,
      session_id: params.sessionId,
      accepted_terms: params.acceptedTerms,
      accepted_terms_version: params.acceptedTermsVersion,
      accepted_terms_timestamp: params.acceptedTermsTimestamp,
      purchase_timestamp: new Date().toISOString(),
    };

    // Calculate SHA-256 hash of payload
    const payloadStr = JSON.stringify(payload, Object.keys(payload).sort());
    const encoded = new TextEncoder().encode(payloadStr);
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
    const hashHex = new TextDecoder().decode(hexEncode(new Uint8Array(hashBuffer)));

    const { data: evidence, error } = await supabase.from("purchase_evidences").insert({
      user_id: params.userId,
      order_id: params.orderId || null,
      email: params.email,
      display_name: params.displayName,
      product_type: params.productType,
      product_name: params.productName,
      amount: params.amount,
      currency: params.currency,
      payment_provider: "stripe",
      payment_intent_id: params.paymentIntentId,
      charge_id: params.chargeId,
      checkout_session_id: params.checkoutSessionId,
      payment_status: params.paymentStatus || "succeeded",
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
      browser_language: params.browserLanguage,
      session_id: params.sessionId,
      accepted_terms: params.acceptedTerms ?? false,
      accepted_terms_version: params.acceptedTermsVersion,
      accepted_terms_timestamp: params.acceptedTermsTimestamp,
      evidence_payload_json: payload,
      evidence_hash: hashHex,
      certification_status: "pending",
    }).select("id").single();

    if (error) {
      console.error("[WEBHOOK] Failed to create purchase evidence:", error.message);
      return null;
    }

    console.log(`[WEBHOOK] â Purchase evidence created: ${evidence?.id}`);

    // Trigger async certification via certify-purchase function
    if (evidence?.id) {
      try {
        const certUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/certify-purchase`;
        fetch(certUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ evidence_id: evidence.id }),
        }).catch(e => console.warn("[WEBHOOK] certify-purchase fire-and-forget error:", e));
      } catch (e) {
        console.warn("[WEBHOOK] Failed to trigger certify-purchase:", e);
      }
    }

    return evidence;
  } catch (err: any) {
    console.error("[WEBHOOK] Error creating purchase evidence:", err.message);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null);
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!webhookSecret || !sig) {
      console.error("[WEBHOOK] Missing webhook secret or signature");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured or signature missing" }),
        { headers: { "Content-Type": "application/json" }, status: 400 }
      );
    }

    const event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    console.log(`[WEBHOOK] Received event: ${event.type}`);

    // ââ checkout.session.completed ââââââââââââââââââââââââââââââââââââââ
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // ââ YouTube Service (OAC / Content ID) âââââââââââââââââââââââââââ
      if (session.metadata?.product_type === "youtube_service") {
        const requestId  = session.metadata.youtube_request_id;
        const serviceType = session.metadata.service_type;
        const ytUserId   = session.metadata.user_id;

        if (requestId) {
          const piId = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent as any)?.id || null;
          await supabase.from("youtube_service_requests").update({
            status: "submitted",
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: piId,
            paid_at: new Date().toISOString(),
            submitted_at: new Date().toISOString(),
          }).eq("id", requestId);

          const ytOrder = await createOrderRecord(supabase, {
            userId: ytUserId || "",
            stripeCheckoutSessionId: session.id,
            stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
            productType: "youtube_service",
            productCode: serviceType || "youtube_service",
            productLabel: serviceType === "oac" ? "Canal Oficial de Artista (OAC)" : "YouTube Content ID",
            billingInterval: null,
            amountGross: (session.amount_total || 5000) / 100,
            amountNet: netFromSession(session),
            currency: session.currency || "eur",
            isSubscription: false,
            isRenewal: false,
            metadata: session.metadata || {},
          });

          // FIX 2026-07-15: este branch (youtube_service, cubre tanto OAC como
          // Content ID) era el unico de los 7 puntos de creacion de ordenes en
          // este webhook que nunca llamaba a createPurchaseEvidence — causa del
          // gap detectado para lazlessa@gmail.com (orden sin evidencia IBS).
          if (ytUserId) {
            try {
              const { data: { user: ytUserForEvidence } } = await supabase.auth.admin.getUserById(ytUserId);
              const { data: ytProfileForEvidence } = await supabase.from("profiles").select("display_name").eq("user_id", ytUserId).maybeSingle();
              await createPurchaseEvidence(supabase, {
                userId: ytUserId,
                orderId: ytOrder?.id,
                email: ytUserForEvidence?.email || undefined,
                displayName: ytProfileForEvidence?.display_name || undefined,
                productType: "youtube_service",
                productName: serviceType === "oac" ? "Canal Oficial de Artista (OAC)" : "YouTube Content ID",
                amount: (session.amount_total || 5000) / 100,
                currency: session.currency || "eur",
                checkoutSessionId: session.id,
                paymentIntentId: piId || undefined,
                paymentStatus: "succeeded",
              });
            } catch (evErr) {
              console.error("[WEBHOOK] youtube_service: failed to create purchase evidence:", evErr);
            }
          }

          if (ytUserId) {
            try {
              const { data: { user: ytUser } } = await supabase.auth.admin.getUserById(ytUserId);
              const { data: ytReq } = await supabase.from("youtube_service_requests").select("form_data, created_at").eq("id", requestId).single();
              const formData = (ytReq?.form_data || {}) as Record<string, unknown>;

              // Resolve private storage paths (documents://...) to short-lived signed URLs
              // so marketing/info recipients can open the identity documents from the email.
              const resolveValue = async (v: unknown): Promise<string> => {
                const raw = typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
                if (raw.startsWith("documents://")) {
                  const path = raw.slice("documents://".length);
                  try {
                    const { data: signed } = await supabase.storage
                      .from("documents")
                      .createSignedUrl(path, 60 * 60 * 24 * 30); // 30 días
                    if (signed?.signedUrl) return signed.signedUrl;
                  } catch (e) { console.error("[WEBHOOK] signUrl error:", e); }
                  return raw;
                }
                return raw;
              };

              if (ytUser?.email) {
                const serviceName = serviceType === "oac" ? "Canal Oficial de Artista (OAC)" : "YouTube Content ID";
                const msgId = crypto.randomUUID();
                await supabase.rpc("enqueue_email", { queue_name: "transactional_emails", payload: { idempotency_key: `yt-service-${requestId}`, message_id: msgId, to: ytUser.email, from: "MusicDibs <noreply@notify.musicdibs.com>", sender_domain: "notify.musicdibs.com", subject: `â Solicitud de ${serviceName} recibida — MusicDibs`, html: `<p>Hemos recibido tu solicitud de <strong>${serviceName}</strong>. ID: ${requestId}. Plazo estimado: 5 días laborables.</p>`, text: `Solicitud de ${serviceName} recibida. ID: ${requestId}. Plazo: 5 días laborables.`, purpose: "transactional", label: "youtube_service_confirmation", queued_at: new Date().toISOString() } });

                const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                const isUrl = (s: string) => /^https?:\/\//i.test(s);
                const entries = await Promise.all(
                  Object.entries(formData).map(async ([k, v]) => [k, await resolveValue(v)] as [string, string])
                );
                const rowsHtml = entries.map(([k, val]) => {
                  const cell = isUrl(val)
                    ? `<a href="${escapeHtml(val)}" target="_blank" rel="noopener">${escapeHtml(val)}</a>`
                   : escapeHtml(val);
                  return `<tr><td style="padding:6px 10px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;vertical-align:top">${escapeHtml(k)}</td><td style="padding:6px 10px;border:1px solid #e5e7eb;white-space:pre-wrap;word-break:break-word">${cell}</td></tr>`;
                }).join("");
                const rowsText = entries.map(([k, val]) => `${k}: ${val}`).join("\n");


                const adminMsgId = crypto.randomUUID();
                await supabase.rpc("enqueue_email", { queue_name: "transactional_emails", payload: { idempotency_key: `yt-service-admin-${requestId}`, message_id: adminMsgId, to: "marketing@musicdibs.com", cc: "info@musicdibs.com", from: "MusicDibs <noreply@notify.musicdibs.com>", sender_domain: "notify.musicdibs.com", reply_to: ytUser.email, subject: `ðº Nueva solicitud ${serviceName} — ${ytUser.email}`, html: `<p>Nueva solicitud de <strong>${serviceName}</strong>.</p><p><strong>Usuario:</strong> ${escapeHtml(ytUser.email)}<br/><strong>Request ID:</strong> ${requestId}<br/><strong>Fecha:</strong> ${new Date().toISOString()}</p><h3 style="margin-top:16px">Datos del formulario</h3><table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:13px">${rowsHtml}</table>`, text: `Nueva solicitud: ${serviceName}\nUsuario: ${ytUser.email}\nRequest ID: ${requestId}\n\nDatos:\n${rowsText}`, purpose: "transactional", label: "youtube_service_admin", queued_at: new Date().toISOString() } });
              }
            } catch (ytEmailErr) { console.error("[WEBHOOK] youtube_service email error:", ytEmailErr); }
          }

          console.log(`[WEBHOOK] â YouTube ${serviceType} request ${requestId} → submitted`);
          return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
        }
      }
      // ââ end YouTube Service handler ââââââââââââââââââââââââââââââââââ

      let userId   = session.metadata?.user_id;
      let credits  = parseInt(session.metadata?.credits || "0", 10);
      let planId   = session.metadata?.plan_id || "unknown";

      //  Fallback A: recover user_id when missing from metadata (guest checkout) 
      if (!userId && session.customer) {
        const custId = typeof session.customer === "string" ? session.customer : (session.customer as any)?.id;
        if (custId) {
          const recoveredProfile = await findProfileByCustomerId(supabase, stripe, custId);
          if (recoveredProfile) {
            userId = recoveredProfile.user_id;
            console.log(`[WEBHOOK] checkout.session.completed: recovered user_id=${userId} from customer ${custId} (metadata missing)`);
          }
        }
      }

      //  Fallback B: recover credits/planId when missing from metadata 
      // FIX 2026-07-15: originally gated to session.mode === "payment" only, so
      // subscription-mode checkouts with missing metadata had NO recovery path —
      // credits stayed 0 and planId stayed "unknown" with no way to resolve them.
      // Root cause of the annual_20/annual_100 mismatch for aurelioecheverria@gmail.com
      // (paid annual_20 checkout, order recorded as "unknown", profile later drifted
      // to annual_100 via a separate reconciliation path). PRICE_CREDITS already
      // covers subscription price IDs (annual_100 legacy, monthly legacy, etc.), and
      // listLineItems works identically for both checkout modes, so this is a safe
      // widen — no new Stripe call shape, just removing the mode restriction.
      if (credits === 0 && (session.mode === "payment" || session.mode === "subscription")) {
        try {
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 5, expand: ["data.price"] });
          const priceId = (lineItems.data[0] as any)?.price?.id;
          if (priceId && PRICE_CREDITS[priceId] !== undefined) {
            credits = PRICE_CREDITS[priceId];
            planId  = PRICE_TO_PLAN_ID[priceId] || "unknown";
            console.log(`[WEBHOOK] checkout.session.completed: recovered credits=${credits} planId=${planId} from price ${priceId} (mode=${session.mode})`);
          } else {
            console.warn(`[WEBHOOK] checkout.session.completed: fallback B could not resolve price ${priceId} (mode=${session.mode}) — credits/planId remain unresolved`);
          }
        } catch (lineItemErr) {
          console.warn("[WEBHOOK] checkout.session.completed: could not fetch line items for fallback:", lineItemErr);
        }
      }

            // FIX 2026-07-17: structural safety net. Antes, si `credits` seguia en 0
      // tras el Fallback B (p.ej. porque PRICE_CREDITS no tiene el price ID
      // actual -- exactamente lo que paso con annual_200/300/500/1000), el
      // bloque entero de abajo se saltaba: sin fila en `subscriptions`, sin
      // orden, sin credito -- en silencio. Desacoplamos la persistencia de
      // `subscriptions` de la resolucion de creditos: si hay userId y sesion
      // de subscripcion, la fila se escribe SIEMPRE, y si credits no se pudo
      // resolver se lanza un admin_alert explicito en vez de fallar callado.
      if (userId && session.mode === "subscription" && credits === 0) {
        console.error(`[WEBHOOK] checkout.session.completed: credits UNRESOLVED for user ${userId} (session ${session.id}, mode=subscription) - writing subscriptions row anyway y alertando`);
        const _rescueSubId = typeof session.subscription === "string" ? session.subscription : (session.subscription as any)?.id || null;
        const _rescueCustomerId = typeof session.customer === "string" ? session.customer : (session.customer as any)?.id || null;
        if (_rescueSubId) {
          await supabase.from("subscriptions").upsert({
            user_id: userId,
            stripe_customer_id: _rescueCustomerId,
            stripe_subscription_id: _rescueSubId,
            plan: "Annual",
            status: "active",
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
        }
        await supabase.from("admin_alerts").insert({
          source: "stripe-webhook:checkout.session.completed",
          severity: "error",
          message: `Credits sin resolver para user ${userId} (session ${session.id}). PRICE_CREDITS no contiene el price ID de esta sesion o metadata vino vacia. Fila subscriptions escrita como red de seguridad, pero faltan creditos y actualizacion de plan/tier -- revisar y corregir manualmente PRICE_CREDITS/PRICE_TO_PLAN_ID.`,
          context: { session_id: session.id, user_id: userId, stripe_subscription_id: _rescueSubId },
        });
      }

      if (userId && credits > 0) {
        // ââ Always UPSERT subscriptions with new stripe_subscription_id ââââââââââââ
        // Must run BEFORE the duplicate guard: migrated users may have a stale
        // subscriptions row with an old stripe_subscription_id. checkout.session.completed
        // only fires on successful payment, so status is always "active".
        const _checkoutSubId = typeof session.subscription === "string"
          ? session.subscription
          : (session.subscription as any)?.id || null;
        const _checkoutCustomerId = typeof session.customer === "string"
          ? session.customer
          : (session.customer as any)?.id || null;
        if (_checkoutSubId) {
          const _checkoutPlanName = PLAN_ID_TO_PLAN_NAME[planId] || null;
          await supabase.from("subscriptions").upsert({
            user_id: userId,
            stripe_customer_id: _checkoutCustomerId,
            stripe_subscription_id: _checkoutSubId,
            plan: _checkoutPlanName || "Annual",
            status: "active",
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
          console.log(`[WEBHOOK] checkout.session.completed: upserted subscriptions stripe_subscription_id=${_checkoutSubId} user=${userId}`);
        }

        // ââ Idempotency guard: skip if this checkout session was already processed ââ
        const { data: existingCheckoutOrder } = await supabase
          .from("orders")
          .select("id")
          .eq("stripe_checkout_session_id", session.id)
          .maybeSingle();

        if (existingCheckoutOrder) {
          console.log(`[WEBHOOK] Duplicate checkout.session.completed for ${session.id} — skipping credits/order`);
          return new Response(JSON.stringify({ received: true, duplicate: true }), {
            headers: { "Content-Type": "application/json" }
          });
        }

        // -- Idempotency guard (simetrico al #2b de subscription_create) --
        // Si el evento "Alta suscripcion" (invoice/subscription_create) ya llego
        // ANTES que este checkout.session.completed y concedio creditos para el
        // mismo customer en la ultima hora, no volver a conceder aqui.
        // Cubre el caso de orden de llegada invertido (tapiabismarck464@gmail.com,
        // 2026-07-09: Alta suscripcion llego 31 min antes que checkout.session.completed).
        const dupCheckWindow = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const _checkoutCustIdForDup = typeof session.customer === "string" ? session.customer : (session.customer as any)?.id || null;
        if (_checkoutCustIdForDup) {
          const { data: existingSubCreateOrder } = await supabase
            .from("orders")
            .select("id")
            .eq("stripe_customer_id", _checkoutCustIdForDup)
            .eq("is_subscription", true)
            .eq("is_renewal", false)
            .is("stripe_checkout_session_id", null)
            .gte("created_at", dupCheckWindow)
            .maybeSingle();

          if (existingSubCreateOrder) {
            console.log(`[WEBHOOK] checkout.session.completed: ya se concedieron creditos via subscription_create para customer ${_checkoutCustIdForDup} - skipping duplicate`);
            return new Response(JSON.stringify({ received: true, duplicate: true }), {
              headers: { "Content-Type": "application/json" }
            });
          }
        }


        // Fetch previous plan BEFORE updating (to detect first annual purchase + plan switch)
        const { data: prevProfile } = await supabase
          .from("profiles").select("subscription_plan, available_credits, permanent_credits").eq("user_id", userId).single();
        const previousPlan = prevProfile?.subscription_plan || "Free";

        // Topups and individual packs never expire: add to permanent_credits too
        const isPermaPurchase = planId.startsWith("topup_") || planId === "individual";
        const isSubscriptionPurchase = !isPermaPurchase && !!PLAN_ID_TO_PLAN_NAME[planId];

        // ââ Plan switch/upgrade: los créditos restantes del plan anterior se acumulan ââ
        // Los créditos no se resetean en el momento del cambio de plan. El usuario conserva
        // los créditos restantes y se suman los nuevos del plan al que ha upgradea/cambiado.
        // Nota: el reset a 0 ocurre únicamente en subscription.deleted (fin del periodo real).
        if (isSubscriptionPurchase && previousPlan !== "Free") {
          console.log(`[WEBHOOK] Plan switch ${previousPlan} → ${planId}: credits preserved (accumulated mode) for user ${userId}`);
        }

        // ATOMIC DEDUP: checkout session ID es unico -- bloquea duplicados a nivel DB
        // (previene el race condition entre checkout.session.completed e invoice.payment_succeeded)
        // FIX 2026-07-21: la clave anterior (`checkout_${session.id}`) es UNICA para este
        // evento checkout.session.completed, pero NUNCA coincide con la clave que usa el
        // handler subscription_create (`inv_create_${invoiceId}`) para la MISMA compra --
        // son namespaces distintos, asi que el UNIQUE constraint jamas detecta el cruce
        // entre ambos eventos (solo protege contra reintentos del MISMO evento). Confirmado
        // en produccion: 30+ casos de "Alta suscripcion" con timing de 1-2s tras "Compra
        // plan X", varios de ellos duplicados reales de credito (thebestcompositor,
        // sirphoenyxmusic2025, martinzamora, y uno mas incluso DESPUES de anadir un guard
        // adicional por tiempo -- confirmando que es una carrera TOCTOU real, no un problema
        // de timing/reintentos que un guard basado en SELECT-antes-de-INSERT pueda cerrar).
        // Se usa el subscriptionId (disponible en AMBOS eventos para el mismo alta) como
        // clave compartida -- asi el UNIQUE constraint bloquea atomicamente al segundo
        // evento que llegue, sea cual sea el orden o el intervalo entre ambos.
        const sharedSubIdForKey = typeof session.subscription === "string" ? session.subscription : (session.subscription as any)?.id || null;
        const checkoutAtomicKey = sharedSubIdForKey ? `initial_credit_sub_${sharedSubIdForKey}` : `checkout_${session.id}`;
        const checkoutAtomic = await supabase.rpc("grant_credits_atomic", {
          p_stripe_event_key: checkoutAtomicKey,
          p_user_id: userId,
          p_credits: credits,
          p_plan_id: planId || "unknown",
          p_source_event: "checkout_completed",
          p_description: `Compra plan ${planId}: +${credits} creditos`,
        });
        if ((checkoutAtomic.data ?? -1) === 0) {
          console.log(`[WEBHOOK] checkout.completed: ATOMIC DEDUP blocked dup key=${checkoutAtomicKey}`);
          return new Response(JSON.stringify({ received: true, duplicate: true }), { headers: { "Content-Type": "application/json" } });
        }
        if (checkoutAtomic.error) {
          console.warn("[WEBHOOK] checkout.completed: grant_credits_atomic error, fallback:", checkoutAtomic.error.message);
          await addCredits(supabase, userId, credits, `Compra plan ${planId}: +${credits} créditos`);
        }
        if (isPermaPurchase) {
          const { data: permProf } = await supabase.from("profiles").select("permanent_credits").eq("user_id", userId).single();
          const newPermanent = (permProf?.permanent_credits ?? 0) + credits;
          await supabase.from("profiles").update({ permanent_credits: newPermanent, updated_at: new Date().toISOString() }).eq("user_id", userId);
          console.log(`[WEBHOOK] permanent_credits +${credits} → ${newPermanent} for user ${userId} (${planId})`);
        }

        const planName = PLAN_ID_TO_PLAN_NAME[planId];

        // Diagnostico: capturar lineItems crudos + metadata + resolucion final
        // para poder investigar si esto vuelve a resolver mal en el futuro.
        {
          let diagLineItems: unknown = null;
          try {
            diagLineItems = (await stripe.checkout.sessions.listLineItems(session.id, { limit: 5, expand: ["data.price"] })).data;
          } catch { /* best-effort, no bloquea */ }
          await logPriceResolution(supabase, {
            sourceEvent: "checkout_completed",
            sessionOrInvoiceId: session.id,
            customerId: typeof session.customer === "string" ? session.customer : (session.customer as any)?.id ?? null,
            userId,
            resolvedPriceId: (diagLineItems as any)?.[0]?.price?.id ?? null,
            resolvedPlanId: planId,
            resolvedPlanName: planName ?? null,
            lineItemsRaw: { metadata: session.metadata ?? null, lineItems: diagLineItems, sessionMode: session.mode },
          });
        }

        // Guard: topups e individuales NUNCA deben sobrescribir subscription_plan
        if (planName && !planId.startsWith("topup_") && planId !== "individual") {
          // FIX 2026-07-17: esta actualizacion no comprobaba su propio resultado
          // ni se verificaba despues. Al menos 2 casos (fruluvejizo-3263@yopmail.com
          // 2026-07-15, faustorode@gmail.com 2026-07-16) quedaron con
          // subscription_plan="Monthly"/subscription_tier=null tras comprar
          // annual_20 pese a que este codigo se ejecuto sin lanzar excepcion
          // visible - causa exacta no reproducida aun. En vez de seguir
          // adivinando, se verifica el resultado inline: si el update no dejo
          // el tier correcto, se reintenta una vez y se alerta si sigue mal.
          const { error: tierUpdateErr } = await supabase
            .from("profiles")
            .update({ subscription_plan: planName, subscription_tier: planId, updated_at: new Date().toISOString() })
            .eq("user_id", userId);
          if (tierUpdateErr) {
            console.error(`[WEBHOOK] checkout.session.completed: profile tier update FAILED for user ${userId} (${planId}):`, tierUpdateErr.message);
          }
          const { data: verifyProfile } = await supabase
            .from("profiles")
            .select("subscription_plan, subscription_tier")
            .eq("user_id", userId)
            .maybeSingle();
          if (verifyProfile?.subscription_tier !== planId) {
            console.error(`[WEBHOOK] checkout.session.completed: tier verification MISMATCH for user ${userId} - expected ${planId}, got ${verifyProfile?.subscription_tier}. Retrying once.`);
            const { error: retryErr } = await supabase
              .from("profiles")
              .update({ subscription_plan: planName, subscription_tier: planId, updated_at: new Date().toISOString() })
              .eq("user_id", userId);
            const { data: verifyAgain } = await supabase
              .from("profiles")
              .select("subscription_tier")
              .eq("user_id", userId)
              .maybeSingle();
            if (retryErr || verifyAgain?.subscription_tier !== planId) {
              await supabase.from("admin_alerts").insert({
                source: "stripe-webhook:checkout.session.completed",
                severity: "error",
                message: `Tier update failed for user ${userId} tras compra de ${planId} (session ${session.id}). Primer error: ${tierUpdateErr?.message ?? "ninguno"}. Reintento error: ${retryErr?.message ?? "ninguno"}. subscription_tier actual: ${verifyAgain?.subscription_tier ?? "desconocido"}. Revisar y corregir manualmente.`,
              });
            } else {
              console.log(`[WEBHOOK] checkout.session.completed: tier retry succeeded for user ${userId} (${planId})`);
            }
          } else {
            console.log(`[WEBHOOK] Updated subscription_plan to ${planName} (tier=${planId}) for user ${userId}`);
          }
        } else if (planName) {
          console.log(`[WEBHOOK] Skipping subscription_plan update for ${planId} (topup/individual)`);
        }

        // Save stripe_customer_id
        let resolvedCustomerId: string | undefined;
        if (session.customer) {
          resolvedCustomerId = typeof session.customer === "string" ? session.customer : session.customer.id;
          await supabase.from("profiles").update({ stripe_customer_id: resolvedCustomerId }).eq("user_id", userId);
          console.log(`[WEBHOOK] Saved stripe_customer_id ${resolvedCustomerId} for user ${userId}`);
        }

        // ââ Create order record ââ
        const sessionMeta = session.metadata || {};
        const amountTotal = session.amount_total ? session.amount_total / 100 : 0;
        const amountNet = netFromSession(session);
        const stripeSubId = typeof session.subscription === "string" ? session.subscription : (session.subscription as any)?.id || null;
        let paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent as any)?.id || null;

        // FIX 2026-07-15 / CORREGIDO 2026-07-17: en checkouts de suscripcion
        // (session.mode === "subscription"), Stripe NUNCA rellena
        // session.payment_intent - hay que resolverlo por otra via. El intento
        // original (leer invoice.payment_intent) NO funciona en esta version de
        // la API de Stripe: invoice.payment_intent ya no existe como campo
        // (confirmado via API directa, caso faustorode@gmail.com 2026-07-17 -
        // el expand de "payment_intent"/"charge" sobre el invoice vino vacio).
        // Tampoco payment_intent tiene un campo "invoice" de vuelta en esta
        // version. La unica via fiable es listar los charges del customer:
        // para un alta nueva via Checkout, es practicamente siempre el unico
        // cargo reciente de ese customer, asi que se toma el que coincide en
        // importe (o el mas reciente si ninguno coincide exacto).
        let checkoutInvoiceId: string | null = null;
        if (session.mode === "subscription") {
          checkoutInvoiceId = typeof session.invoice === "string" ? session.invoice : (session.invoice as any)?.id || null;
        }
        if (!paymentIntentId && session.mode === "subscription" && resolvedCustomerId) {
          try {
            const recentCharges = await stripe.charges.list({ customer: resolvedCustomerId, limit: 5 });
            const expectedAmountCents = Math.round(amountTotal * 100);
            const match = recentCharges.data.find((c: any) => c.amount === expectedAmountCents) || recentCharges.data[0];
            if (match) {
              paymentIntentId = typeof match.payment_intent === "string" ? match.payment_intent : (match.payment_intent as any)?.id || null;
              console.log(`[WEBHOOK] checkout.session.completed: resolved paymentIntent ${paymentIntentId} via charges.list (customer=${resolvedCustomerId}, subscription mode)`);
            }
          } catch (e) {
            console.warn(`[WEBHOOK] checkout.session.completed: failed to list charges for customer ${resolvedCustomerId}:`, e);
          }
        }

        // Check for discount/coupon
        let couponCode: string | undefined;
        let promotionCode: string | undefined;
        try {
          if (session.total_details && (session.total_details as any).breakdown?.discounts?.length > 0) {
            const discount = (session.total_details as any).breakdown.discounts[0];
            couponCode = discount?.discount?.coupon?.id;
            promotionCode = discount?.discount?.promotion_code;
          }
        } catch { /* ignore */ }

        // Derive chargeId from PaymentIntent for fee lookup
        let checkoutChargeId: string | null = null;
        if (paymentIntentId) {
          try {
            const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });
            const lc = (pi as any)?.latest_charge;
            checkoutChargeId = typeof lc === "string" ? lc : (lc?.id ?? null);
          } catch (err) {
            console.warn(`[WEBHOOK] failed to retrieve PI ${paymentIntentId} for fee:`, (err as any)?.message || err);
          }
        }
        const checkoutStripeFee = await getStripeFee(stripe, checkoutChargeId);

        const order = await createOrderRecord(supabase, {
          userId,
          stripeCheckoutSessionId: session.id,
          stripeInvoiceId: checkoutInvoiceId || undefined,
          stripeSubscriptionId: stripeSubId,
          stripePaymentIntentId: paymentIntentId,
          stripeChargeId: checkoutChargeId || undefined,
          stripeCustomerId: resolvedCustomerId,
          productType: sessionMeta.product_type || getProductType(planId),
          productCode: sessionMeta.product_code || planId,
          productLabel: sessionMeta.product_label || planId,
          billingInterval: sessionMeta.billing_interval || null,
          amountGross: amountTotal,
          amountNet,
          stripeFee: checkoutStripeFee,
          currency: session.currency || "eur",
          isSubscription: !!stripeSubId,
          isRenewal: false,
          couponCode: couponCode || sessionMeta.coupon_code,
          promotionCode,
          metadata: sessionMeta,
        });

        // ââ Create purchase evidence ââ
        {
          const { data: { user: evUser } } = await supabase.auth.admin.getUserById(userId);
          const { data: evProfile } = await supabase.from("profiles").select("display_name").eq("user_id", userId).single();
          await createPurchaseEvidence(supabase, {
            userId,
            orderId: order?.id,
            email: evUser?.email,
            displayName: evProfile?.display_name || evUser?.email,
            productType: sessionMeta.product_type || getProductType(planId),
            productName: sessionMeta.product_label || planId,
            amount: amountTotal,
            currency: session.currency || "eur",
            paymentIntentId: paymentIntentId || undefined,
            chargeId: undefined,
            checkoutSessionId: session.id,
            paymentStatus: "succeeded",
            acceptedTerms: sessionMeta.accepted_terms === "true" || sessionMeta.accepted_terms === true,
            acceptedTermsVersion: sessionMeta.accepted_terms_version,
            acceptedTermsTimestamp: sessionMeta.accepted_terms_timestamp,
          });
        }

        // Send purchase confirmation email
        try {
          const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);
          if (authUser?.email) {
            const { data: profileData } = await supabase.from("profiles").select("display_name, language").eq("user_id", userId).single();
            const displayName = profileData?.display_name || authUser.user_metadata?.display_name || authUser.email.split("@")[0];
            const userLang = profileData?.language;
            let invoiceUrl: string | undefined;
            if (resolvedCustomerId) {
              try {
                const invoices = await stripe.invoices.list({ customer: resolvedCustomerId, limit: 1 });
                if (invoices.data[0]?.hosted_invoice_url) invoiceUrl = invoices.data[0].hosted_invoice_url;
              } catch (e) { console.warn("[WEBHOOK] Could not fetch invoice URL:", e); }
            }
            const email = creditPurchaseEmail({ name: displayName, planName: planName || planId, credits, invoiceUrl, lang: userLang });
            const messageId = crypto.randomUUID();
            await supabase.from("email_send_log").insert({ message_id: messageId, template_name: "credit_purchase", recipient_email: authUser.email, status: "pending" });
            await supabase.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                idempotency_key: `credit-purchase-${messageId}`, message_id: messageId,
                to: authUser.email, from: "MusicDibs <noreply@notify.musicdibs.com>", sender_domain: "notify.musicdibs.com",
                subject: email.subject, html: email.html, text: email.text,
                purpose: "transactional", label: "credit_purchase", queued_at: new Date().toISOString(),
              },
            });
            console.log(`[WEBHOOK] Purchase confirmation email enqueued for ${authUser.email}`);
          }
        } catch (emailErr) {
          console.error("[WEBHOOK] Error enqueuing purchase email:", emailErr);
        }

        // ââ MailerLite sync: purchase (skip for top-ups and individual credits to preserve subscription group) ââ
        const isTopUpOrIndividual = planId.startsWith("topup_") || planId === "individual";
        if (!isTopUpOrIndividual) {
          try {
            const { data: { user: mlUser } } = await supabase.auth.admin.getUserById(userId);
            if (mlUser?.email) {
              const { data: mlProfile } = await supabase.from("profiles").select("language").eq("user_id", userId).single();
              const mlCustId = session.customer ? (typeof session.customer === "string" ? session.customer : (session.customer as any).id) : "";
              await syncMailerLite("purchase.completed", {
                email: mlUser.email, locale: mlProfile?.language || "es",
                plan_type: planToMailerLiteType(planName || planId), stripe_customer_id: mlCustId,
              });
            }
          } catch (mlErr) { console.warn("[WEBHOOK] MailerLite purchase sync error:", mlErr); }
        } else {
          console.log(`[WEBHOOK] Skipping MailerLite group sync for ${planId} (top-up/individual — preserving subscription group)`);
        }

        // ââ Notify team: first annual subscription (distribution onboarding) ââ
        const ANNUAL_IDS = ["annual_100", "annual_200", "annual_300", "annual_500", "annual_1000"];
        if (ANNUAL_IDS.includes(planId) && previousPlan !== "Annual") {
          try {
            const { data: { user: distUser } } = await supabase.auth.admin.getUserById(userId);
            const distEmail = distUser?.email || "desconocido";
            const { data: distProfile } = await supabase.from("profiles").select("display_name").eq("user_id", userId).single();
            const distName = distProfile?.display_name || distEmail.split("@")[0];

            const distHtml = `<h2>ðµ Nuevo alta en Distribución</h2><p>Un usuario ha contratado su primera suscripción anual y necesita ser dado de alta en la plataforma de distribución.</p><table style="border-collapse:collapse;margin:16px 0;"><tr><td style="padding:6px 12px;font-weight:bold;">Usuario:</td><td style="padding:6px 12px;">${distName}</td></tr><tr><td style="padding:6px 12px;font-weight:bold;">Email:</td><td style="padding:6px 12px;">${distEmail}</td></tr><tr><td style="padding:6px 12px;font-weight:bold;">Plan:</td><td style="padding:6px 12px;">${planId}</td></tr><tr><td style="padding:6px 12px;font-weight:bold;">Créditos:</td><td style="padding:6px 12px;">${credits}</td></tr><tr><td style="padding:6px 12px;font-weight:bold;">User ID:</td><td style="padding:6px 12px;">${userId}</td></tr></table><p>ð <a href="https://musicdibs.sonosuite.com/">Dar de alta en Sonosuite</a></p>`;
            const distText = `Nuevo alta en Distribución\nUsuario: ${distName}\nEmail: ${distEmail}\nPlan: ${planId}\nCréditos: ${credits}\nUser ID: ${userId}\nDar de alta en: https://musicdibs.sonosuite.com/`;

            const distMsgId = crypto.randomUUID();
            await supabase.from("email_send_log").insert({ message_id: distMsgId, template_name: "distribution_onboarding", recipient_email: "marketing@musicdibs.com", status: "pending" });
            await supabase.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                idempotency_key: `dist-onboard-${userId}-${planId}`, message_id: distMsgId,
                to: "marketing@musicdibs.com", cc: "info@musicdibs.com",
                from: "MusicDibs <noreply@notify.musicdibs.com>", sender_domain: "notify.musicdibs.com",
                subject: "Nuevo alta en Distribución", html: distHtml, text: distText,
                purpose: "transactional", label: "distribution_onboarding", queued_at: new Date().toISOString(),
              },
            });
            console.log(`[WEBHOOK] â Distribution onboarding email enqueued for user ${distEmail}`);

            // User-facing email: distribution access info
            const userMsgId = crypto.randomUUID();
            const { data: distLangProfile } = await supabase.from("profiles").select("language").eq("user_id", userId).single();
            const distLang = distLangProfile?.language || distUser?.user_metadata?.language || "es";
            const distWelcome = distributionWelcomeEmail({ name: distName, email: distEmail, planId, lang: distLang });
            await supabase.from("email_send_log").insert({ message_id: userMsgId, template_name: "distribution_welcome", recipient_email: distEmail, status: "pending" });
            await supabase.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                to: distEmail, from: "MusicDibs <noreply@notify.musicdibs.com>", sender_domain: "notify.musicdibs.com",
                subject: distWelcome.subject, html: distWelcome.html, text: distWelcome.text,
                purpose: "transactional", idempotency_key: `dist-welcome-${userId}-${planId}`, message_id: userMsgId,
                label: "distribution_welcome", queued_at: new Date().toISOString(),
              },
            });
            console.log(`[WEBHOOK] â Distribution welcome email enqueued for ${distEmail}`);
          } catch (distErr: any) {
            console.error("[WEBHOOK] Error enqueuing distribution emails:", distErr);
            try {
              await supabase.from("admin_alerts").insert({
                source: "stripe-webhook:checkout.session.completed",
                severity: "warning",
                message: `Fallo al encolar avisos de alta en distribucion para user ${userId} (plan ${planId}): ${distErr?.message ?? distErr}. Revisar y notificar manualmente si procede.`,
              });
            } catch { /* best-effort */ }
          }
        }
      }
    }

    // ââ invoice.payment_succeeded / invoice_payment.paid (renovaciones) â
    if (event.type === "invoice.payment_succeeded" || event.type === "invoice_payment.paid") {
      const obj = event.data.object as any;

      let customerId: string;
      let billingReason: string | null = null;
      let priceId: string | undefined;
      let invoiceId: string | undefined;
      let subscriptionId: string | undefined;
      let invoiceAmount = 0;
      let invoiceCurrency = "eur";
      let chargeId: string | null = null;
      let invoiceNet: number | null = null;

      if (event.type === "invoice_payment.paid") {
        const invId = typeof obj.invoice === "string" ? obj.invoice : obj.invoice?.id;
        if (invId) {
          const invoice = await stripe.invoices.retrieve(invId);
          customerId = getInvoiceCustomerId(invoice);
          billingReason = invoice.billing_reason as string | null;
          priceId = getInvoicePriceId(invoice);
          invoiceId = invId;
          subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : (invoice.subscription as any)?.id;
          invoiceAmount = (invoice.amount_paid || 0) / 100;
          invoiceNet = netFromInvoice(invoice);
          invoiceCurrency = invoice.currency || "eur";
          chargeId = typeof (invoice as any).charge === "string" ? (invoice as any).charge : ((invoice as any).charge?.id ?? null);
        } else {
          console.warn("[WEBHOOK] invoice_payment.paid: no invoice ID found");
          return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
        }
      } else {
        const invoice = obj;
        customerId = getInvoiceCustomerId(invoice);
        billingReason = invoice.billing_reason;
        priceId = getInvoicePriceId(invoice);
        invoiceId = invoice.id;
        subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
        invoiceAmount = (invoice.amount_paid || 0) / 100;
        invoiceNet = netFromInvoice(invoice);
        invoiceCurrency = invoice.currency || "eur";
        chargeId = typeof invoice.charge === "string" ? invoice.charge : (invoice.charge?.id ?? null);
      }

      if (billingReason === "subscription_cycle") {
        const profile = await findProfileByCustomerId(supabase, stripe, customerId);

        if (profile) {
          // ââ Idempotency guard: skip if this renewal invoice was already processed ââ
          if (invoiceId) {
            const { data: existingRenewalOrder } = await supabase
              .from("orders")
              .select("id")
              .eq("stripe_invoice_id", invoiceId)
              .eq("is_renewal", true)
              .maybeSingle();

            if (existingRenewalOrder) {
              console.log(`[WEBHOOK] Duplicate renewal for invoice ${invoiceId} — skipping`);
              return new Response(JSON.stringify({ received: true, duplicate: true }), {
                headers: { "Content-Type": "application/json" }
              });
            }
          }

          const { credits, source: creditsSource, tier: dbTier } = await resolveCreditsForUser(supabase, profile.user_id, priceId);
          console.log(`[WEBHOOK] subscription_cycle: credits=${credits} source=${creditsSource} tier=${dbTier} price=${priceId}`);
          console.log(`[WEBHOOK] credits resolved via: ${dbTier ? "subscription_tier=" + dbTier : "PRICE_CREDITS=" + priceId} → ${credits} credits`);

          if (credits > 0) {
            const { data: rProf } = await supabase.from("profiles").select("permanent_credits").eq("user_id", profile.user_id).single();
            const permanentCr = rProf?.permanent_credits ?? 0;
            const totalCr = credits + permanentCr;
            await supabase.from("profiles").update({ available_credits: totalCr, updated_at: new Date().toISOString() }).eq("user_id", profile.user_id);
            await supabase.from("credit_transactions").insert({
              user_id: profile.user_id, amount: credits, type: "renewal",
              description: `Renovación: ${credits} (plan) + ${permanentCr} (permanentes) = ${totalCr} total`,
            });
            console.log(`[WEBHOOK] Reset credits to ${credits} for user ${profile.user_id} (renewal)`);
          }

          // ââ Create renewal order ââ
          const resolvedPlanId = priceId ? (PRICE_TO_PLAN_ID[priceId] || dbTier || "unknown") : (dbTier || "unknown");
          const productType = getProductType(resolvedPlanId);
          const planLabel = `Renovación ${PLAN_ID_TO_PLAN_NAME[resolvedPlanId] ?? resolvedPlanId}`;

          const renewalStripeFee = await getStripeFee(stripe, chargeId);
          const renewalOrder = await createOrderRecord(supabase, {
            userId: profile.user_id,
            stripeInvoiceId: invoiceId,
            stripeChargeId: chargeId || undefined,
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: customerId || undefined,
            productType,
            productCode: resolvedPlanId,
            productLabel: planLabel,
            billingInterval: productType === "annual" ? "yearly" : productType === "monthly" ? "monthly" : null,
            amountGross: invoiceAmount,
            amountNet: invoiceNet ?? undefined,
            stripeFee: renewalStripeFee,
            currency: invoiceCurrency,
            isSubscription: true,
            isRenewal: true,
            metadata: {},
          });

          // ââ Create purchase evidence for renewal ââ
          {
            const { data: { user: rnUser } } = await supabase.auth.admin.getUserById(profile.user_id);
            const { data: rnProfile } = await supabase.from("profiles").select("display_name").eq("user_id", profile.user_id).single();
            await createPurchaseEvidence(supabase, {
              userId: profile.user_id,
              orderId: renewalOrder?.id,
              email: rnUser?.email,
              displayName: rnProfile?.display_name,
              productType,
              productName: planLabel,
              amount: invoiceAmount,
              currency: invoiceCurrency,
              paymentStatus: "succeeded",
            });
          }
        } else {
          console.warn(`[WEBHOOK] payment_succeeded: no profile found for customer ${customerId}`);
        }
      }

      // ââ Plan change (upgrade/downgrade) → accumulate credits ââ
      if (billingReason === "subscription_update") {
        const profile = await findProfileByCustomerId(supabase, stripe, customerId);

        if (profile) {
          // ââ Idempotency guard: skip if this plan-change invoice was already processed ââ
          if (invoiceId) {
            const { data: existingUpdateOrder } = await supabase
              .from("orders")
              .select("id")
              .eq("stripe_invoice_id", invoiceId)
              .maybeSingle();

            if (existingUpdateOrder) {
              console.log(`[WEBHOOK] Duplicate subscription_update for invoice ${invoiceId} — skipping`);
              return new Response(JSON.stringify({ received: true, duplicate: true }), {
                headers: { "Content-Type": "application/json" }
              });
            }
          }

          // Fetch previous plan BEFORE updating (to detect Monthly → Annual upgrade)
          const { data: prevUpgradeProfile } = await supabase
            .from("profiles")
            .select("subscription_plan, subscription_tier")
            .eq("user_id", profile.user_id)
            .single();
          const previousPlanBeforeUpgrade = prevUpgradeProfile?.subscription_plan || "Free";
          const previousTierBeforeUpgrade = prevUpgradeProfile?.subscription_tier || null;

          // For subscription_update, invoice line items contain proration entries
          // whose price is the OLD plan. Get the NEW plan's price from the subscription.
          let actualPriceId = priceId;
          if (subscriptionId) {
            const subPriceId = await getSubscriptionPriceId(stripe, subscriptionId);
            if (subPriceId) {
              actualPriceId = subPriceId;
              console.log(`[WEBHOOK] subscription_update: resolved NEW plan price ${actualPriceId} from subscription ${subscriptionId}`);
            }
          }

          // FIX RACE CONDITION (caso ladydaymgs 2026-07-03): cuando un usuario hace
          // upgrade y downgrade en cuestion de segundos, Stripe puede emitir 2 invoices
          // "subscription_update" casi simultaneas. Si las procesamos con el precio
          // resuelto en el instante inicial de cada webhook, uno de los dos eventos
          // puede aplicar creditos de un tier que Stripe ya abandono. Estabilizamos
          // esperando 2s y volviendo a leer el precio EN VIVO justo antes de decidir,
          // quedandonos siempre con el estado mas reciente posible de Stripe.
          await new Promise(r => setTimeout(r, 2000));
          if (subscriptionId) {
            const stablePriceId = await getSubscriptionPriceId(stripe, subscriptionId);
            if (stablePriceId && stablePriceId !== actualPriceId) {
              console.log(`[WEBHOOK] subscription_update: price changed during stabilization (${actualPriceId} -> ${stablePriceId}), usando el mas reciente`);
              actualPriceId = stablePriceId;
            }
          }

          // FIX: Usar TIER_CREDITS directo con el nuevo precio (no resolveCreditsForUser
          // que lee subscription_tier del perfil que aun tiene el tier anterior)
          const newTierFromPrice = actualPriceId ? (PRICE_TO_PLAN_ID[actualPriceId] || null) : null;
          const newCreditsFromTier = newTierFromPrice ? (TIER_CREDITS[newTierFromPrice] ?? 0) : 0;
          console.log(`[WEBHOOK] subscription_update: prev tier=${previousTierBeforeUpgrade} new tier=${newTierFromPrice} credits=${newCreditsFromTier} price=${actualPriceId}`);

          // FIX 2026-07-19 (caso kevinbernalflores@gmail.com): tras un impago
          // definitivo, un cron/webhook anterior puede haber puesto los creditos
          // de plan a 0 SIN resetear subscription_tier (el tier se queda igual
          // porque la suscripcion sigue siendo la misma en Stripe, solo cambio
          // de estado). Si el usuario paga con exito despues (reintento manual o
          // actualizacion de metodo de pago) para ese MISMO tier, el guard
          // original solo miraba si el tier habia cambiado -- como no habia
          // cambiado, se saltaba la concesion de creditos aunque el saldo real
          // estuviera en 0. Ahora tambien se autorepara cuando el tier no cambio
          // pero los creditos de plan actuales son menores que los esperados.
          const { data: freshProfileCheck } = await supabase
            .from("profiles").select("subscription_tier, available_credits, permanent_credits").eq("user_id", profile.user_id).single();
          const currentTierRightNow = freshProfileCheck?.subscription_tier ?? previousTierBeforeUpgrade;
          const currentPlanCreditsNow = Math.max(0, (freshProfileCheck?.available_credits ?? 0) - (freshProfileCheck?.permanent_credits ?? 0));

          // Guard: only assign credits if the plan tier actually changed respecto al
          // estado MAS RECIENTE en DB (no el que leimos al principio de la funcion),
          // O si el tier es el mismo pero los creditos de plan estan por debajo de
          // lo esperado (recuperacion tras impago que ya habia revertido creditos).
          const tierActuallyChanged = newTierFromPrice !== currentTierRightNow;
          const creditsUnderExpected = newCreditsFromTier > 0 && currentPlanCreditsNow < newCreditsFromTier;
          if (!tierActuallyChanged && !creditsUnderExpected) {
            console.log(`[WEBHOOK] subscription_update: tier unchanged y creditos ya correctos (${currentPlanCreditsNow}/${newCreditsFromTier}), skipping credit assignment`);
          } else if (newCreditsFromTier > 0) {
            if (!tierActuallyChanged && creditsUnderExpected) {
              console.log(`[WEBHOOK] subscription_update: tier unchanged pero creditos por debajo de lo esperado (${currentPlanCreditsNow}/${newCreditsFromTier}) -- autoreparando (probable recuperacion tras impago)`);
            }
            // FIX: Resetear creditos al nuevo tier (no acumular) — cubre tanto upgrade como downgrade
            const { data: permProfile } = await supabase.from("profiles").select("permanent_credits").eq("user_id", profile.user_id).single();
            const permanentCr = permProfile?.permanent_credits ?? 0;
            const totalCr = newCreditsFromTier + permanentCr;
            await supabase.from("profiles").update({ available_credits: totalCr, updated_at: new Date().toISOString() }).eq("user_id", profile.user_id);
            await supabase.from("credit_transactions").insert({ user_id: profile.user_id, amount: newCreditsFromTier, type: "purchase", description: `Cambio de plan: ${newTierFromPrice} ${newCreditsFromTier} creditos` });
            console.log(`[WEBHOOK] Plan change: reset credits to ${totalCr} for ${profile.user_id}`);
          } else {
            console.warn(`[WEBHOOK] subscription_update: no credits mapping for tier ${newTierFromPrice}`);
          }

          // Update plan name
          const resolvedPlanId = actualPriceId ? (PRICE_TO_PLAN_ID[actualPriceId] || null) : null;
          const planName = resolvedPlanId ? (PLAN_ID_TO_PLAN_NAME[resolvedPlanId] || null) : null;
          if (planName) {
            await supabase.from("profiles").update({ subscription_plan: planName, subscription_tier: resolvedPlanId }).eq("user_id", profile.user_id);
            console.log(`[WEBHOOK] Plan change: updated plan to ${planName} (tier=${resolvedPlanId}) for user ${profile.user_id}`);
            // Sync MailerLite: move to new plan group
            const { data: { user: changeUser } } = await supabase.auth.admin.getUserById(profile.user_id);
            if (changeUser?.email) {
              const { data: mlProfile } = await supabase.from("profiles").select("language").eq("user_id", profile.user_id).single();
              await syncMailerLite("purchase.completed", {
                email: changeUser.email,
                locale: mlProfile?.language || "es",
                plan_type: planToMailerLiteType(planName),
                stripe_customer_id: customerId,
              });
            }
          }

          // ââ Distribution onboarding: upgrade Monthly → Annual ââ
          const ANNUAL_IDS_UP = ["annual_100", "annual_200", "annual_300", "annual_500", "annual_1000"];
          if (resolvedPlanId && ANNUAL_IDS_UP.includes(resolvedPlanId) && previousPlanBeforeUpgrade !== "Annual") {
            try {
              const { data: { user: distUser } } = await supabase.auth.admin.getUserById(profile.user_id);
              const distEmail = distUser?.email || "desconocido";
              const { data: distProfile } = await supabase.from("profiles").select("display_name").eq("user_id", profile.user_id).single();
              const distName = distProfile?.display_name || distEmail.split("@")[0];

              const distHtml = `<h2>ðµ Nuevo alta en Distribución (upgrade)</h2><p>Un usuario ha hecho upgrade a suscripción anual y necesita ser dado de alta en la plataforma de distribución.</p><table style="border-collapse:collapse;margin:16px 0;"><tr><td style="padding:6px 12px;font-weight:bold;">Usuario:</td><td style="padding:6px 12px;">${distName}</td></tr><tr><td style="padding:6px 12px;font-weight:bold;">Email:</td><td style="padding:6px 12px;">${distEmail}</td></tr><tr><td style="padding:6px 12px;font-weight:bold;">Plan:</td><td style="padding:6px 12px;">${resolvedPlanId}</td></tr><tr><td style="padding:6px 12px;font-weight:bold;">User ID:</td><td style="padding:6px 12px;">${profile.user_id}</td></tr></table><p>ð <a href="https://musicdibs.sonosuite.com/">Dar de alta en Sonosuite</a></p>`;
              const distText = `Nuevo alta en Distribución (upgrade)\nUsuario: ${distName}\nEmail: ${distEmail}\nPlan: ${resolvedPlanId}\nUser ID: ${profile.user_id}\nDar de alta en: https://musicdibs.sonosuite.com/`;

              const distMsgId = crypto.randomUUID();
              await supabase.from("email_send_log").insert({ message_id: distMsgId, template_name: "distribution_onboarding", recipient_email: "marketing@musicdibs.com", status: "pending" });
              await supabase.rpc("enqueue_email", {
                queue_name: "transactional_emails",
                payload: {
                  idempotency_key: `dist-onboard-${profile.user_id}-${resolvedPlanId}`, message_id: distMsgId,
                  to: "marketing@musicdibs.com", cc: "info@musicdibs.com",
                  from: "MusicDibs <noreply@notify.musicdibs.com>", sender_domain: "notify.musicdibs.com",
                  subject: "Nuevo alta en Distribución (upgrade)", html: distHtml, text: distText,
                  purpose: "transactional", label: "distribution_onboarding", queued_at: new Date().toISOString(),
                },
              });
              console.log(`[WEBHOOK] â Distribution onboarding email enqueued (upgrade) for user ${distEmail}`);

              // User-facing email: distribution access info
              const userMsgId = crypto.randomUUID();
              const { data: distLangProfile } = await supabase.from("profiles").select("language").eq("user_id", profile.user_id).single();
              const distLang = distLangProfile?.language || distUser?.user_metadata?.language || "es";
              const distWelcome = distributionWelcomeEmail({ name: distName, email: distEmail, planId: resolvedPlanId, lang: distLang });
              await supabase.from("email_send_log").insert({ message_id: userMsgId, template_name: "distribution_welcome", recipient_email: distEmail, status: "pending" });
              await supabase.rpc("enqueue_email", {
                queue_name: "transactional_emails",
                payload: {
                  to: distEmail, from: "MusicDibs <noreply@notify.musicdibs.com>", sender_domain: "notify.musicdibs.com",
                  subject: distWelcome.subject, html: distWelcome.html, text: distWelcome.text,
                  purpose: "transactional", idempotency_key: `dist-welcome-${profile.user_id}-${resolvedPlanId}`, message_id: userMsgId,
                  label: "distribution_welcome", queued_at: new Date().toISOString(),
                },
              });
              console.log(`[WEBHOOK] â Distribution welcome email enqueued (upgrade) for ${distEmail}`);
            } catch (distUpgradeErr: any) {
              console.error("[WEBHOOK] Error enqueuing distribution upgrade emails:", distUpgradeErr);
              try {
                await supabase.from("admin_alerts").insert({
                  source: "stripe-webhook:subscription_update",
                  severity: "warning",
                  message: `Fallo al encolar avisos de alta en distribucion (upgrade) para user ${profile.user_id} (plan ${resolvedPlanId}): ${distUpgradeErr?.message ?? distUpgradeErr}. Revisar y notificar manualmente si procede.`,
                });
              } catch { /* best-effort */ }
            }
          }

          // ââ Create order record for plan change ââ
          const planId = resolvedPlanId || "unknown";
          const productType = getProductType(planId);
          const changeStripeFee = await getStripeFee(stripe, chargeId);
          const changeOrder = await createOrderRecord(supabase, {
            userId: profile.user_id,
            stripeInvoiceId: invoiceId,
            stripeChargeId: chargeId || undefined,
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: customerId || undefined,
            productType,
            productCode: planId,
            productLabel: `Cambio a ${planId}`,
            billingInterval: productType === "annual" ? "yearly" : productType === "monthly" ? "monthly" : null,
            amountGross: invoiceAmount,
            amountNet: invoiceNet ?? undefined,
            stripeFee: changeStripeFee,
            currency: invoiceCurrency,
            isSubscription: true,
            isRenewal: false,
            metadata: {},
          });

          // ââ Create purchase evidence for plan change ââ
          {
            const { data: { user: chUser } } = await supabase.auth.admin.getUserById(profile.user_id);
            const { data: chProfile } = await supabase.from("profiles").select("display_name").eq("user_id", profile.user_id).single();
            await createPurchaseEvidence(supabase, {
              userId: profile.user_id,
              orderId: changeOrder?.id,
              email: chUser?.email,
              displayName: chProfile?.display_name,
              productType,
              productName: `Cambio a ${planId}`,
              amount: invoiceAmount,
              currency: invoiceCurrency,
              paymentStatus: "succeeded",
            });
          }
        } else {
          console.warn(`[WEBHOOK] subscription_update: no profile found for customer ${customerId}`);
        }
      }

      // ââ Nueva suscripción creada directamente (sin Checkout Session) âââââ
      if (billingReason === "subscription_create") {
        const profile = await findProfileByCustomerId(supabase, stripe, customerId);

        if (profile) {
          // Guard #0: If subscriptionId is null in event payload, retrieve from Stripe
          // (Stripe sometimes sends invoice events before subscription is fully attached)
          if (!subscriptionId && invoiceId) {
            try {
              const fullInv = await stripe.invoices.retrieve(invoiceId);
              const resolvedSubId = typeof fullInv.subscription === "string"
                ? fullInv.subscription
                : (fullInv.subscription as any)?.id ?? undefined;
              if (resolvedSubId) {
                subscriptionId = resolvedSubId;
                console.log(`[WEBHOOK] subscription_create: resolved subscriptionId ${subscriptionId} from Stripe for invoice ${invoiceId}`);
              }
            } catch (e) {
              console.warn("[WEBHOOK] subscription_create: could not retrieve invoice from Stripe:", e);
            }
          }

          // Idempotency guard: skip if this create invoice was already processed
          if (invoiceId) {
            const { data: existingCreateOrder } = await supabase
              .from("orders")
              .select("id")
              .eq("stripe_invoice_id", invoiceId)
              .maybeSingle();

            if (existingCreateOrder) {
              console.log(`[WEBHOOK] Duplicate subscription_create for invoice ${invoiceId} — skipping`);
              return new Response(JSON.stringify({ received: true, duplicate: true }), {
                headers: { "Content-Type": "application/json" }
              });
            }
          }

          // Idempotency guard #2: skip if checkout.session.completed already handled this subscription
          // (checkout orders have stripe_checkout_session_id set but no stripe_invoice_id)
          if (subscriptionId) {
            const { data: existingCheckoutOrder } = await supabase
              .from("orders")
              .select("id")
              .eq("stripe_subscription_id", subscriptionId)
              .eq("is_renewal", false)
              .not("stripe_checkout_session_id", "is", null)
              .maybeSingle();

            if (existingCheckoutOrder) {
              console.log(`[WEBHOOK] subscription_create: checkout already processed sub ${subscriptionId} — skipping duplicate invoice credits`);
              return new Response(JSON.stringify({ received: true, duplicate: true }), {
                headers: { "Content-Type": "application/json" }
              });
            }
            // FIX race condition: checkout.session.completed puede llegar hasta 2s despues
            // del invoice.payment_succeeded. Esperar 1.5s y reintentar el check antes de
            // asumir que no hay checkout order (evita doble-credito, caso ibidemoficial 2026-06-29).
            await new Promise(r => setTimeout(r, 1500));
            const { data: existingCheckoutOrder2 } = await supabase
              .from("orders").select("id")
              .eq("stripe_subscription_id", subscriptionId)
              .eq("is_renewal", false)
              .not("stripe_checkout_session_id", "is", null)
              .maybeSingle();
            if (existingCheckoutOrder2) {
              console.log(`[WEBHOOK] subscription_create: checkout order found after delay (sub ${subscriptionId}) — skipping`);
              return new Response(JSON.stringify({ received: true, duplicate: true }), { headers: { "Content-Type": "application/json" } });
            }
          }

          // Idempotency guard #2b: fallback for when subscriptionId could NOT be
          // resolved (Stripe sometimes sends this invoice without `invoice.subscription`
         // populated, e.g. invoice in_xxx for yervinzeledon@gmail.com on 2026-06-10,
          // which bypassed guard #2 entirely and granted a duplicate "Alta suscripción
          // undefined: +N créditos" on top of the checkout.session.completed credits).
          // Match by customer instead: if a non-renewal subscription order already
          // exists for this customer from the last hour (i.e. checkout.session.completed
          // already ran for this signup), treat this invoice as the duplicate side of
          // the same purchase and skip granting credits again.
          if (!subscriptionId && customerId) {
            const recentWindow = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            const { data: existingRecentSignupOrder } = await supabase
              .from("orders")
              .select("id")
              .eq("stripe_customer_id", customerId)
              .eq("is_subscription", true)
              .eq("is_renewal", false)
              .not("stripe_checkout_session_id", "is", null)
              .gte("created_at", recentWindow)
              .maybeSingle();

            if (existingRecentSignupOrder) {
              console.log(`[WEBHOOK] subscription_create: no subscriptionId resolved, but checkout.session.completed already processed a recent signup for customer ${customerId} — skipping duplicate invoice credits`);
              return new Response(JSON.stringify({ received: true, duplicate: true }), {
                headers: { "Content-Type": "application/json" }
              });
            }

            // FIX 2026-07-25 (caso doctrinamusic.org@gmail.com): a diferencia del
            // guard #2 (por subscriptionId), este guard #2b nunca esperaba antes de
            // decidir "no existe orden todavia" -- checkout.session.completed puede
            // tardar hasta ~2s en insertar su propia orden (igual que en el guard #2),
            // asi que sin este mismo reintento, el guard 2b encontraba "nada" por pura
            // carrera de tiempos y dejaba pasar el credito duplicado con la clave
            // atomica de fallback ("unknown"), que nunca coincide con la del checkout.
            await new Promise(r => setTimeout(r, 1500));
            const { data: existingRecentSignupOrder2 } = await supabase
              .from("orders")
              .select("id")
              .eq("stripe_customer_id", customerId)
              .eq("is_subscription", true)
              .eq("is_renewal", false)
              .not("stripe_checkout_session_id", "is", null)
              .gte("created_at", recentWindow)
              .maybeSingle();
            if (existingRecentSignupOrder2) {
              console.log(`[WEBHOOK] subscription_create: checkout order found after delay via guard #2b (customer ${customerId}) — skipping`);
              return new Response(JSON.stringify({ received: true, duplicate: true }), {
                headers: { "Content-Type": "application/json" }
              });
            }
          }

          // Resolve price from subscription (more reliable than invoice line items).
          // Retrieve the full subscription object ONCE and reuse it below for the
          // subscriptions-table sync, instead of adding a second sequential Stripe
          // call to an already call-heavy branch (timeout risk, see incident notes).
          let actualPriceId = priceId;
          let fullSubscription: any = null;
          if (subscriptionId) {
            try {
              fullSubscription = await stripe.subscriptions.retrieve(subscriptionId);
              const subPriceId = fullSubscription.items?.data?.[0]?.price?.id;
              if (subPriceId) {
                actualPriceId = subPriceId;
                console.log(`[WEBHOOK] subscription_create: resolved price ${actualPriceId} from subscription ${subscriptionId}`);
              }
            } catch (e) {
              console.warn("[WEBHOOK] subscription_create: failed to retrieve subscription:", e);
            }
          }

          const resolvedPlanId = actualPriceId ? (PRICE_TO_PLAN_ID[actualPriceId] || null) : null;
          const planName = resolvedPlanId ? (PLAN_ID_TO_PLAN_NAME[resolvedPlanId] || null) : null;

          // ── Sincronizar tabla subscriptions local ──────────────────────────
          // FIX 2026-07-14: esta rama (alta directa vía invoice.payment_succeeded,
          // billing_reason=subscription_create, SIN Checkout Session) es la única
          // de las cuatro rutas de alta/cambio de suscripción que NUNCA escribía en
          // `subscriptions` — checkout.session.completed, customer.subscription.updated
          // y customer.subscription.deleted sí lo hacen. Resultado: perfiles con plan
          // activo y créditos concedidos pero sin fila en `subscriptions`, detectados
          // por detect_active_plan_without_subscription. Se corre ANTES de conceder
          // créditos (igual que en checkout.session.completed) para que quede
          // persistida incluso si algo falla más adelante en la rama.
          if (subscriptionId) {
            const subItem = fullSubscription?.items?.data?.[0] as any;
            const periodStartRaw = subItem?.current_period_start ?? fullSubscription?.current_period_start;
            const periodEndRaw = subItem?.current_period_end ?? fullSubscription?.current_period_end;
            const { error: subSyncError } = await supabase.from("subscriptions").upsert({
              user_id: profile.user_id,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              plan: planName || "Annual",
              status: fullSubscription?.status ? mapStripeStatus(fullSubscription.status) : "active",
              current_period_start: periodStartRaw ? new Date(periodStartRaw * 1000).toISOString() : null,
              current_period_end: periodEndRaw ? new Date(periodEndRaw * 1000).toISOString() : null,
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });
            if (subSyncError) {
              console.error(`[WEBHOOK] subscription_create: FAILED to upsert subscriptions for user ${profile.user_id}:`, subSyncError.message);
              await supabase.from("admin_alerts").insert({
                source: "stripe-webhook:subscription_create",
                severity: "warning",
                message: `No se pudo sincronizar subscriptions para user ${profile.user_id} sub=${subscriptionId}: ${subSyncError.message}`,
              });
            } else {
              console.log(`[WEBHOOK] subscription_create: upserted subscriptions sub=${subscriptionId} user=${profile.user_id}`);
            }
          } else {
            console.warn(`[WEBHOOK] subscription_create: no subscriptionId resolved — subscriptions table NOT synced for customer ${customerId}`);
            await supabase.from("admin_alerts").insert({
              source: "stripe-webhook:subscription_create",
              severity: "warning",
              message: `subscription_create sin subscriptionId resuelto para customer ${customerId} (invoice ${invoiceId ?? "n/a"}) — revisar manualmente, subscriptions no sincronizada.`,
            });
          }

          // Diagnostico: mismo registro que en checkout.session.completed.
          await logPriceResolution(supabase, {
            sourceEvent: "subscription_create",
            sessionOrInvoiceId: invoiceId,
            customerId,
            userId: profile.user_id,
            resolvedPriceId: actualPriceId,
            resolvedPlanId: resolvedPlanId ?? null,
            resolvedPlanName: planName ?? null,
            lineItemsRaw: { subscriptionId, note: "subscription_create branch" },
          });

          // Update plan/tier in profile
          if (planName && resolvedPlanId) {
            await supabase.from("profiles")
              .update({ subscription_plan: planName, subscription_tier: resolvedPlanId, updated_at: new Date().toISOString() })
              .eq("user_id", profile.user_id);
            console.log(`[WEBHOOK] subscription_create: set plan ${planName} (tier=${resolvedPlanId}) for user ${profile.user_id}`);
          }

          // Resolve credits (after setting tier so resolveCreditsForUser finds correct tier)
          const { credits: createCredits, source: createSource, tier: createTier } = await resolveCreditsForUser(supabase, profile.user_id, actualPriceId);
          console.log(`[WEBHOOK] subscription_create: credits=${createCredits} source=${createSource} tier=${createTier} price=${actualPriceId}`);

          // FIX 2026-07-21: guard #2/#2b (por subscriptionId exacto, o por
          // customerId solo cuando subscriptionId no se resolvio) fallaron en la
          // practica en 3 casos en 48h (thebestcompositor@gmail.com,
          // sirphoenyxmusic2025@gmail.com, martinzamora@rocketmail.com) --
          // "Alta suscripcion undefined" duplico creditos ya otorgados por
          // checkout.session.completed segundos antes, pese a que los guards
          // existentes deberian haberlo detectado. Sin poder confirmar la causa
          // exacta (logs ya rotados), se anade una ultima comprobacion
          // INCONDICIONAL por customerId (no solo cuando falta subscriptionId)
          // justo antes de conceder creditos, como red de seguridad adicional.
          if (customerId) {
            const finalDupWindow = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const { data: finalExistingOrder } = await supabase
              .from("orders")
              .select("id, created_at")
              .eq("stripe_customer_id", customerId)
              .eq("is_subscription", true)
              .eq("is_renewal", false)
              .gte("created_at", finalDupWindow)
              .maybeSingle();
            if (finalExistingOrder) {
              console.log(`[WEBHOOK] subscription_create: FINAL GUARD blocked dup for customer ${customerId} (existing order ${finalExistingOrder.id} at ${finalExistingOrder.created_at}) — skipping credit grant`);
              return new Response(JSON.stringify({ received: true, duplicate: true, finalGuard: true }), { headers: { "Content-Type": "application/json" } });
            }
          }

          if (createCredits > 0) {
            // ATOMIC DEDUP via grant_credits_atomic (ON CONFLICT stripe_event_key)
            // FIX 2026-07-21: usar la MISMA clave compartida que checkout.session.completed
            // (basada en subscriptionId) para que el UNIQUE constraint de grant_credits_atomic
            // bloquee de verdad el cruce entre ambos eventos para la misma alta de suscripcion.
            const atomicKey = subscriptionId ? `initial_credit_sub_${subscriptionId}` : (invoiceId ? `inv_create_${invoiceId}` : `cust_${customerId}_${Date.now()}`);
            const atomicResult = await supabase.rpc("grant_credits_atomic", {
              p_stripe_event_key: atomicKey,
              p_user_id: profile.user_id,
              p_credits: createCredits,
              p_plan_id: resolvedPlanId || actualPriceId || "unknown",
              p_source_event: "subscription_create",
              p_description: `Alta suscripcion ${resolvedPlanId || actualPriceId}: +${createCredits} creditos`,
            });
            if ((atomicResult.data ?? -1) === 0) {
              console.log(`[WEBHOOK] subscription_create: ATOMIC DEDUP blocked dup key=${atomicKey}`);
              return new Response(JSON.stringify({ received: true, duplicate: true }), { headers: { "Content-Type": "application/json" } });
            }
            if (atomicResult.error) {
              console.warn("[WEBHOOK] subscription_create: grant_credits_atomic error, fallback:", atomicResult.error.message);
              await addCredits(supabase, profile.user_id, createCredits, `Alta suscripcion ${resolvedPlanId || actualPriceId}: +${createCredits} creditos`);
            } else {
              console.log(`[WEBHOOK] subscription_create: granted ${createCredits} credits atomically for user ${profile.user_id}`);
            }
          } else {
            console.warn(`[WEBHOOK] subscription_create: no credits mapping for price ${actualPriceId} (tier=${createTier})`);
          }

          // Save stripe_customer_id
          if (customerId) {
            await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("user_id", profile.user_id);
          }

          // Create order record
          const createProductType = resolvedPlanId ? getProductType(resolvedPlanId) : "unknown";
          const createStripeFee = await getStripeFee(stripe, chargeId);
          const createOrder = await createOrderRecord(supabase, {
            userId: profile.user_id,
            stripeInvoiceId: invoiceId,
            stripeSubscriptionId: subscriptionId,
            stripeChargeId: chargeId || undefined,
            stripeCustomerId: customerId || undefined,
            productType: createProductType,
            productCode: resolvedPlanId || "unknown",
            productLabel: `Nueva suscripción ${resolvedPlanId || "unknown"}`,
            billingInterval: createProductType === "annual" ? "yearly" : createProductType === "monthly" ? "monthly" : null,
            amountGross: invoiceAmount,
            amountNet: invoiceNet ?? undefined,
            stripeFee: createStripeFee,
            currency: invoiceCurrency,
            isSubscription: true,
            isRenewal: false,
            metadata: {},
          });

          // Purchase evidence
          {
            const { data: { user: crUser } } = await supabase.auth.admin.getUserById(profile.user_id);
            const { data: crProfile } = await supabase.from("profiles").select("display_name").eq("user_id", profile.user_id).single();
            await createPurchaseEvidence(supabase, {
              userId: profile.user_id,
              orderId: createOrder?.id,
              email: crUser?.email,
              displayName: crProfile?.display_name,
              productType: createProductType,
              productName: `Nueva suscripción ${resolvedPlanId || "unknown"}`,
              amount: invoiceAmount,
              currency: invoiceCurrency,
              paymentStatus: "succeeded",
            });
          }

          // MailerLite sync
          try {
            const { data: { user: crMlUser } } = await supabase.auth.admin.getUserById(profile.user_id);
            if (crMlUser?.email) {
              const { data: crMlProfile } = await supabase.from("profiles").select("language").eq("user_id", profile.user_id).single();
              await syncMailerLite("purchase.completed", {
                email: crMlUser.email,
                locale: crMlProfile?.language || "es",
                plan_type: planToMailerLiteType(planName || ""),
                stripe_customer_id: customerId,
              });
            }
          } catch (mlCreateErr) { console.warn("[WEBHOOK] subscription_create MailerLite error:", mlCreateErr); }

          // Distribution emails for annual plans
          const ANNUAL_IDS_CREATE = ["annual_100", "annual_200", "annual_300", "annual_500", "annual_1000"];
          if (resolvedPlanId && ANNUAL_IDS_CREATE.includes(resolvedPlanId)) {
            try {
              const { data: { user: distUser } } = await supabase.auth.admin.getUserById(profile.user_id);
              const distEmail = distUser?.email || "desconocido";
              const { data: distProfile } = await supabase.from("profiles").select("display_name").eq("user_id", profile.user_id).single();
              const distName = distProfile?.display_name || distEmail.split("@")[0];

              const distHtml = `<h2>ðµ Nuevo alta en Distribución</h2><p>Un usuario ha contratado su primera suscripción anual y necesita ser dado de alta en la plataforma de distribución.</p><table style="border-collapse:collapse;margin:16px 0;"><tr><td style="padding:6px 12px;font-weight:bold;">Usuario:</td><td style="padding:6px 12px;">${distName}</td></tr><tr><td style="padding:6px 12px;font-weight:bold;">Email:</td><td style="padding:6px 12px;">${distEmail}</td></tr><tr><td style="padding:6px 12px;font-weight:bold;">Plan:</td><td style="padding:6px 12px;">${resolvedPlanId}</td></tr><tr><td style="padding:6px 12px;font-weight:bold;">Créditos:</td><td style="padding:6px 12px;">${createCredits}</td></tr><tr><td style="padding:6px 12px;font-weight:bold;">User ID:</td><td style="padding:6px 12px;">${profile.user_id}</td></tr></table><p>ð <a href="https://musicdibs.sonosuite.com/">Dar de alta en Sonosuite</a></p>`;
              const distText = `Nuevo alta en Distribución
Usuario: ${distName}
Email: ${distEmail}
Plan: ${resolvedPlanId}
Créditos: ${createCredits}
User ID: ${profile.user_id}
Dar de alta en: https://musicdibs.sonosuite.com/`;

              const distMsgId = crypto.randomUUID();
              await supabase.from("email_send_log").insert({ message_id: distMsgId, template_name: "distribution_onboarding", recipient_email: "marketing@musicdibs.com", status: "pending" });
              await supabase.rpc("enqueue_email", {
                queue_name: "transactional_emails",
                payload: {
                  idempotency_key: `dist-onboard-${profile.user_id}-${resolvedPlanId}`, message_id: distMsgId,
                  to: "marketing@musicdibs.com", cc: "info@musicdibs.com",
                  from: "MusicDibs <noreply@notify.musicdibs.com>", sender_domain: "notify.musicdibs.com",
                  subject: "Nuevo alta en Distribución", html: distHtml, text: distText,
                  purpose: "transactional", label: "distribution_onboarding", queued_at: new Date().toISOString(),
                },
              });

              const userMsgId = crypto.randomUUID();
              const { data: distLangProfile } = await supabase.from("profiles").select("language").eq("user_id", profile.user_id).single();
              const distLang = distLangProfile?.language || distUser?.user_metadata?.language || "es";
              const distWelcome = distributionWelcomeEmail({ name: distName, email: distEmail, planId: resolvedPlanId, lang: distLang });
              await supabase.from("email_send_log").insert({ message_id: userMsgId, template_name: "distribution_welcome", recipient_email: distEmail, status: "pending" });
              await supabase.rpc("enqueue_email", {
                queue_name: "transactional_emails",
                payload: {
                  to: distEmail, from: "MusicDibs <noreply@notify.musicdibs.com>", sender_domain: "notify.musicdibs.com",
                  subject: distWelcome.subject, html: distWelcome.html, text: distWelcome.text,
                  purpose: "transactional", idempotency_key: `dist-welcome-${profile.user_id}-${resolvedPlanId}`, message_id: userMsgId,
                  label: "distribution_welcome", queued_at: new Date().toISOString(),
                },
              });
              console.log(`[WEBHOOK] â Distribution emails enqueued for ${distEmail} (subscription_create)`);
            } catch (distCreateErr: any) {
              console.error("[WEBHOOK] Error enqueuing distribution emails (subscription_create):", distCreateErr);
              try {
                await supabase.from("admin_alerts").insert({
                  source: "stripe-webhook:subscription_create",
                  severity: "warning",
                  message: `Fallo al encolar avisos de alta en distribucion para user ${profile.user_id} (plan ${resolvedPlanId}): ${distCreateErr?.message ?? distCreateErr}. Revisar y notificar manualmente si procede.`,
                });
              } catch { /* best-effort */ }
            }
          }
        } else {
          console.warn(`[WEBHOOK] subscription_create: no profile found for customer ${customerId}`);
        }
      }
    }

    // ââ invoice.payment_failed / invoice_payment.failed ââââââââââââââââââ
    if (event.type === "invoice.payment_failed" || event.type === "invoice_payment.failed") {
      const obj = event.data.object as any;

      let customerId: string;
      let attemptCount: number;
      let nextAttempt: string | null;

      if (event.type === "invoice_payment.failed") {
        const invoiceId = typeof obj.invoice === "string" ? obj.invoice : obj.invoice?.id;
        if (invoiceId) {
          const invoice = await stripe.invoices.retrieve(invoiceId);
          customerId = getInvoiceCustomerId(invoice);
          attemptCount = invoice.attempt_count ?? 0;
          nextAttempt = invoice.next_payment_attempt ? new Date((invoice.next_payment_attempt as number) * 1000).toISOString() : null;
        } else {
          console.warn("[WEBHOOK] invoice_payment.failed: no invoice ID found");
          return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
        }
      } else {
        // FIX: no confiar en el payload crudo del evento — next_payment_attempt
        // puede no estar calculado aun en el momento exacto del webhook (Smart
        // Retries lo resuelve de forma asincrona). Releer la invoice fresca.
        const staleInvoice = obj;
        const invoiceId = staleInvoice.id;
        let invoice = staleInvoice;
        try {
          invoice = await stripe.invoices.retrieve(invoiceId);
        } catch (reErr) {
          console.warn("[WEBHOOK] invoice.payment_failed: no se pudo releer invoice, usando payload original:", reErr);
        }
        customerId = getInvoiceCustomerId(invoice);
        attemptCount = invoice.attempt_count ?? staleInvoice.attempt_count;
        nextAttempt = invoice.next_payment_attempt ? new Date((invoice.next_payment_attempt as number) * 1000).toISOString() : null;
      }

      const profile = await findProfileByCustomerId(supabase, stripe, customerId);
      if (profile) {
        const description = `Fallo en cobro de suscripción (intento ${attemptCount})${nextAttempt ? `. Próximo reintento: ${nextAttempt}`: ". No hay más reintentos."}`;
        await supabase.from("credit_transactions").insert({ user_id: profile.user_id, amount: 0, type: "payment_failed", description });
        console.log(`[WEBHOOK] Payment failed for user ${profile.user_id} (attempt ${attemptCount})`);

        // FIX 2026-07-21: antes, este handler nunca inicializaba el seguimiento
        // de periodo de gracia (payment_grace_expires_at / payment_issue_count /
        // payment_issue_notified_at). Dependia enteramente de que el cron de
        // reconciliacion diario lo detectara y corrigiera -- hasta 24h de
        // ventana en la que un impago real no tenia gracia registrada en
        // nuestro sistema. Detectado 2026-07-21 via auditoria (bruno.drdireito@
        // gmail.com, juanmabastidas49@gmail.com: factura fallo a las 05:53 UTC,
        // gracia no inicializada hasta que el cron la corrigio a las ~07:00 UTC).
        // Se inicializa aqui en tiempo real, con la misma ventana de 7 dias que
        // usa el cron, y SOLO si no habia ya una gracia activa (no pisar una
        // gracia mas larga si ya estaba en curso por un intento anterior).
        try {
          const { data: currentProfile } = await supabase.from("profiles")
            .select("payment_grace_expires_at, payment_issue_count")
            .eq("user_id", profile.user_id).single();
          const graceStillActive = currentProfile?.payment_grace_expires_at &&
            new Date(currentProfile.payment_grace_expires_at) > new Date();
          if (!graceStillActive) {
            const graceExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
            await supabase.from("profiles").update({
              payment_grace_expires_at: graceExpiresAt,
              payment_issue_count: (currentProfile?.payment_issue_count ?? 0) + 1,
              payment_issue_notified_at: new Date().toISOString(),
            }).eq("user_id", profile.user_id);
            console.log(`[WEBHOOK] payment_failed: grace period initialized for user ${profile.user_id}, expires ${graceExpiresAt}`);
          }
        } catch (graceErr) {
          console.error("[WEBHOOK] payment_failed: error initializing grace period:", graceErr);
        }

        // FIX: Si no hay mas reintentos (impago definitivo), resetear creditos de plan
        // y crear evidencia IBS de "cancelacion por impago" inmediatamente (no esperar
        // al subscription.deleted, que puede tardar dias en llegar).
        if (!nextAttempt) {
          try {
            const { data: failedProfile } = await supabase.from("profiles")
              .select("subscription_tier, subscription_plan, available_credits, permanent_credits")
              .eq("user_id", profile.user_id).single();
            const planCredits = Math.max(0, (failedProfile?.available_credits ?? 0) - (failedProfile?.permanent_credits ?? 0));
            if (planCredits > 0) {
              await supabase.from("profiles").update({
                available_credits: failedProfile?.permanent_credits ?? 0,
                updated_at: new Date().toISOString(),
              }).eq("user_id", profile.user_id);
              await supabase.from("credit_transactions").insert({
                user_id: profile.user_id, amount: -planCredits, type: "admin_reset",
                description: `Creditos de suscripcion eliminados por impago definitivo: -${planCredits}`,
              });
            }
            const failedPlanId = failedProfile?.subscription_tier || "unknown";
            const failedPlanName = PLAN_ID_TO_PLAN_NAME[failedPlanId] || failedProfile?.subscription_plan || "Unknown";
            const failedOrder = await createOrderRecord(supabase, {
              userId: profile.user_id, stripeCustomerId: customerId || undefined,
              productType: getProductType(failedPlanId), productCode: failedPlanId,
              productLabel: `Cancelacion por impago: ${failedPlanName}`,
              billingInterval: null, amountGross: 0, stripeFee: 0, currency: "eur",
              isSubscription: true, isRenewal: false,
              metadata: { cancellation_reason: "payment_failed_definitive", attempt_count: attemptCount },
              orderStatus: "cancelled",
            });
            const { data: { user: failedUser } } = await supabase.auth.admin.getUserById(profile.user_id);
            const { data: failedDisp } = await supabase.from("profiles").select("display_name").eq("user_id", profile.user_id).single();
            await createPurchaseEvidence(supabase, {
              userId: profile.user_id, orderId: failedOrder?.id,
              email: failedUser?.email, displayName: failedDisp?.display_name,
              productType: "cancellation",
              productName: `Cancelacion por impago definitivo: ${failedPlanName}`,
              amount: 0, currency: "eur", paymentStatus: "failed",
            });
            console.log(`[WEBHOOK] payment_failed definitive: credits reset + IBS evidence created for ${profile.user_id}`);
          } catch (failedEvErr) {
            console.warn("[WEBHOOK] payment_failed definitive: failed to create evidence:", failedEvErr);
          }
        }


        // ── Intento 4+: marcar cancel_at_period_end como ultimo aviso ──
        if (attemptCount >= 4) {
          try {
            const pastDueSubs = await stripe.subscriptions.list({
              customer: customerId, status: "past_due", limit: 5,
            });
            for (const sub of pastDueSubs.data) {
              if (!sub.cancel_at_period_end) {
                await stripe.subscriptions.modify(sub.id, { cancel_at_period_end: true });
                console.log(`[WEBHOOK] Sub ${sub.id} marcada cancel_at_period_end=true (intento ${attemptCount})`);
              }
            }
          } catch (e) { console.warn("[WEBHOOK] Error marcando cancel_at_period_end:", e); }
        }

        try {
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          const userEmail = customer.email || "";
          const userName = customer.name || userEmail;
          if (userEmail) {
            const { data: profileData } = await supabase.from("profiles").select("language").eq("user_id", profile.user_id).single();
            const email = paymentFailedEmail({ name: userName, description, attemptCount, nextAttempt, lang: profileData?.language });
            const messageId = crypto.randomUUID();
            await supabase.from("email_send_log").insert({ message_id: messageId, template_name: "payment_failed", recipient_email: userEmail, status: "pending" });
            await supabase.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                idempotency_key: `payment-failed-${messageId}`, message_id: messageId,
                to: userEmail, from: "MusicDibs <noreply@notify.musicdibs.com>", sender_domain: "notify.musicdibs.com",
                subject: email.subject, html: email.html, text: email.text,
                purpose: "transactional", label: "payment_failed", queued_at: new Date().toISOString(),
              },
            });
            const adminMsgId = crypto.randomUUID();
            await supabase.from("email_send_log").insert({ message_id: adminMsgId, template_name: "payment_failed_admin", recipient_email: "info@musicdibs.com", status: "pending" });
            await supabase.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                idempotency_key: `payment-failed-admin-${adminMsgId}`, message_id: adminMsgId,
                to: "info@musicdibs.com", from: "MusicDibs <noreply@notify.musicdibs.com>", sender_domain: "notify.musicdibs.com",
                subject: `[MusicDibs] Fallo de pago - ${userEmail}`, html: email.html, text: email.text,
                purpose: "transactional", label: "payment_failed_admin", queued_at: new Date().toISOString(),
              },
            });
          }
        } catch (emailErr) { console.error("[WEBHOOK] Error enqueuing payment failure email:", emailErr); }
      } else {
        console.warn(`[WEBHOOK] payment_failed: no profile found for customer ${customerId}`);
      }
    }

    // ââ customer.subscription.updated ââââââââââââââââââââââââââââââââââ
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : (subscription.customer as any)?.id ?? "";
      const priceId = subscription.items?.data?.[0]?.price?.id;
      const status = subscription.status;

      // Guard: skip if only trial_end (or trial_start) changed — no real plan change.
      const prevAttrs = (event.data as any).previous_attributes ?? {};
      const prevAttrKeys = Object.keys(prevAttrs);
      const onlyTrialEndChanged = prevAttrKeys.length > 0 &&
        prevAttrKeys.every(k => ["trial_end", "trial_start", "billing_cycle_anchor"].includes(k));
      if (onlyTrialEndChanged) {
        console.log(`[WEBHOOK] subscription.updated: only trial_end/trial_start changed — skipping (prev_attrs: ${JSON.stringify(prevAttrs)})`);
        return new Response(JSON.stringify({ received: true, skipped: "trial_end_only" }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      const profile = await findProfileByCustomerId(supabase, stripe, customerId);
      if (profile) {
        // FIX 2026-07-16: PRICE_PLAN es un mapa viejo e incompleto que nunca
        // incluyo varios precios "Live production" (annual_20, annual_200/300/
        // 500/1000 TMDVw, el segundo monthly TMDW3, topups, individual). Para
        // esos precios planName salia null aunque planTier (via PRICE_TO_PLAN_ID,
        // que si esta completo) resolvia bien - dejando profiles.subscription_plan
        // desincronizado o con un valor viejo (caso aurelioecheverria@gmail.com:
        // quedo en "Monthly" pese a estar en annual_20). Se deriva planName desde
        // PLAN_ID_TO_PLAN_NAME[planTier], la misma fuente que ya usan
        // subscription_create y checkout.session.completed - PRICE_PLAN queda sin uso.
        const planTier = priceId ? (PRICE_TO_PLAN_ID[priceId] || null) : null;
        const planName = planTier ? (PLAN_ID_TO_PLAN_NAME[planTier] || null) : null;
        // Capture previous plan BEFORE updating so we can detect Monthly→Annual transitions
        const { data: prevUpdProfile } = await supabase
          .from("profiles").select("subscription_plan").eq("user_id", profile.user_id).single();
        const previousPlanOnUpdate = prevUpdProfile?.subscription_plan || "Free";
        if (status === "active" && planName) {
          // Diagnostico: este handler carecia de logPriceResolution -- es la
          // TERCERA ruta que puede escribir subscription_plan/tier (ademas de
          // checkout.session.completed y subscription_create), y la unica sin
          // verificacion ni reintento. Confirmado 2026-07-23 (jmontoyataber@
          // gmail.com): stripe_price_resolution_log solo tenia el registro de
          // checkout_completed con resolucion CORRECTA (annual_20), sin ningun
          // admin_alert de mismatch -- es decir, algo escribio "Monthly"/null
          // DESPUES de esa verificacion exitosa, por una ruta no instrumentada.
          // Este handler es la principal sospechosa al ser la unica sin log ni
          // verificacion. Se anade ambos ahora para confirmar o descartar en el
          // proximo caso.
          await logPriceResolution(supabase, {
            sourceEvent: "subscription_updated",
            sessionOrInvoiceId: subscription.id,
            customerId,
            userId: profile.user_id,
            resolvedPriceId: priceId ?? null,
            resolvedPlanId: planTier,
            resolvedPlanName: planName,
            lineItemsRaw: { status, previousPlanOnUpdate, previousAttributes: prevAttrs, subscriptionItems: subscription.items?.data ?? null },
          });

          const { error: subUpdTierErr } = await supabase
            .from("profiles")
            .update({ subscription_plan: planName, subscription_tier: planTier, updated_at: new Date().toISOString() })
            .eq("user_id", profile.user_id);
          if (subUpdTierErr) {
            console.error(`[WEBHOOK] subscription.updated: profile tier update FAILED for user ${profile.user_id}:`, subUpdTierErr.message);
          }
          const { data: verifySubUpd } = await supabase
            .from("profiles")
            .select("subscription_tier")
            .eq("user_id", profile.user_id)
            .maybeSingle();
          if (verifySubUpd?.subscription_tier !== planTier) {
            console.error(`[WEBHOOK] subscription.updated: tier verification MISMATCH for user ${profile.user_id} - expected ${planTier}, got ${verifySubUpd?.subscription_tier}. Retrying once.`);
            const { error: subUpdRetryErr } = await supabase
              .from("profiles")
              .update({ subscription_plan: planName, subscription_tier: planTier, updated_at: new Date().toISOString() })
              .eq("user_id", profile.user_id);
            const { data: verifySubUpdAgain } = await supabase
              .from("profiles")
              .select("subscription_tier")
              .eq("user_id", profile.user_id)
              .maybeSingle();
            if (subUpdRetryErr || verifySubUpdAgain?.subscription_tier !== planTier) {
              await supabase.from("admin_alerts").insert({
                source: "stripe-webhook:customer.subscription.updated",
                severity: "error",
                message: `Tier update failed for user ${profile.user_id} en subscription.updated (subscription ${subscription.id}, priceId ${priceId}). Primer error: ${subUpdTierErr?.message ?? "ninguno"}. Reintento error: ${subUpdRetryErr?.message ?? "ninguno"}. subscription_tier actual: ${verifySubUpdAgain?.subscription_tier ?? "desconocido"}. Revisar y corregir manualmente.`,
              });
            } else {
              console.log(`[WEBHOOK] subscription.updated: tier retry succeeded for user ${profile.user_id} (${planTier})`);
            }
          } else {
            console.log(`[WEBHOOK] subscription.updated → plan set to ${planName} (tier=${planTier}) for user ${profile.user_id}`);
          }

          // ââ Distribution onboarding: transition to Annual (idempotent via idempotency_key) ââ
          const ANNUAL_TIERS_SU = ["annual_100", "annual_200", "annual_300", "annual_500", "annual_1000"];
          if (planTier && ANNUAL_TIERS_SU.includes(planTier) && previousPlanOnUpdate !== "Annual") {
            try {
              const { data: { user: distUser } } = await supabase.auth.admin.getUserById(profile.user_id);
              const distEmail = distUser?.email || "desconocido";
              const { data: distProfile } = await supabase.from("profiles").select("display_name, language").eq("user_id", profile.user_id).single();
              const distName = distProfile?.display_name || distEmail.split("@")[0];
              const distLang = distProfile?.language || (distUser?.user_metadata as any)?.language || "es";

              const distHtml = `<h2>ðµ Nuevo alta en Distribución</h2><p>Un usuario ha pasado a suscripción anual y necesita ser dado de alta en la plataforma de distribución.</p><table style="border-collapse:collapse;margin:16px 0;"><tr><td style="padding:6px 12px;font-weight:bold;">Usuario:</td><td style="padding:6px 12px;">${distName}</td></tr><tr><td style="padding:6px 12px;font-weight:bold;">Email:</td><td style="padding:6px 12px;">${distEmail}</td></tr><tr><td style="padding:6px 12px;font-weight:bold;">Plan:</td><td style="padding:6px 12px;">${planTier}</td></tr><tr><td style="padding:6px 12px;font-weight:bold;">User ID:</td><td style="padding:6px 12px;">${profile.user_id}</td></tr></table><p>ð <a href="https://musicdibs.sonosuite.com/">Dar de alta en Sonosuite</a></p>`;
              const distText = `Nuevo alta en Distribución\nUsuario: ${distName}\nEmail: ${distEmail}\nPlan: ${planTier}\nUser ID: ${profile.user_id}\nDar de alta en: https://musicdibs.sonosuite.com/`;

              const distMsgId = crypto.randomUUID();
              await supabase.from("email_send_log").insert({ message_id: distMsgId, template_name: "distribution_onboarding", recipient_email: "marketing@musicdibs.com", status: "pending" });
              await supabase.rpc("enqueue_email", {
                queue_name: "transactional_emails",
                payload: {
                  idempotency_key: `dist-onboard-${profile.user_id}-${planTier}`, message_id: distMsgId,
                  to: "marketing@musicdibs.com", cc: "info@musicdibs.com",
                  from: "MusicDibs <noreply@notify.musicdibs.com>", sender_domain: "notify.musicdibs.com",
                  subject: "Nuevo alta en Distribución", html: distHtml, text: distText,
                  purpose: "transactional", label: "distribution_onboarding", queued_at: new Date().toISOString(),
                },
              });

              const userMsgId = crypto.randomUUID();
              const distWelcome = distributionWelcomeEmail({ name: distName, email: distEmail, planId: planTier, lang: distLang });
              await supabase.from("email_send_log").insert({ message_id: userMsgId, template_name: "distribution_welcome", recipient_email: distEmail, status: "pending" });
              await supabase.rpc("enqueue_email", {
                queue_name: "transactional_emails",
                payload: {
                  to: distEmail, from: "MusicDibs <noreply@notify.musicdibs.com>", sender_domain: "notify.musicdibs.com",
                  subject: distWelcome.subject, html: distWelcome.html, text: distWelcome.text,
                  purpose: "transactional", idempotency_key: `dist-welcome-${profile.user_id}-${planTier}`, message_id: userMsgId,
                  label: "distribution_welcome", queued_at: new Date().toISOString(),
                },
              });
              console.log(`[WEBHOOK] â Distribution emails enqueued (subscription.updated) for ${distEmail} tier=${planTier}`);
            } catch (distSuErr: any) {
              console.error("[WEBHOOK] Error enqueuing distribution emails (subscription.updated):", distSuErr);
              try {
                await supabase.from("admin_alerts").insert({
                  source: "stripe-webhook:customer.subscription.updated",
                  severity: "warning",
                  message: `Fallo al encolar avisos de alta en distribucion para user ${profile.user_id} (tier ${planTier}): ${distSuErr?.message ?? distSuErr}. Revisar y notificar manualmente si procede.`,
                });
              } catch { /* best-effort */ }
            }
          }
        } else if (status === "past_due" || status === "unpaid") {
          await supabase.from("credit_transactions").insert({
            user_id: profile.user_id, amount: 0, type: "subscription_issue",
            description: `Suscripción en estado "${status}". Se requiere acción de pago.`,
          });
        } else if (status === "canceled" || status === "incomplete_expired") {
          // Solo actualizar plan a Free — los créditos se resetean en subscription.deleted
          // cuando el periodo de facturación realmente termina (cancel_at_period_end=true)
          await supabase.from("profiles").update({
            subscription_plan: "Free", subscription_tier: null,
            updated_at: new Date().toISOString(),
          }).eq("user_id", profile.user_id);
          console.log(`[WEBHOOK] subscription.updated ${status} → Free (credits preserved until subscription.deleted) for user ${profile.user_id}`);
        }

        // ââ Sincronizar tabla subscriptions local ââ
        const subStatus = mapStripeStatus(status);
        const itemPeriodStart = (subscription.items.data[0] as any)?.current_period_start;
        const itemPeriodEnd = (subscription.items.data[0] as any)?.current_period_end;
        const periodStartRaw = itemPeriodStart ?? (subscription as any).current_period_start;
        const periodEndRaw = itemPeriodEnd ?? (subscription as any).current_period_end;
        const periodStart = periodStartRaw ? new Date(periodStartRaw * 1000).toISOString() : null;
        const periodEnd = periodEndRaw ? new Date(periodEndRaw * 1000).toISOString() : null;

        await supabase.from("subscriptions").upsert({
          user_id: profile.user_id,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          plan: planName || "Annual",
          status: subStatus,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        if (subStatus === "active" && planName) {
          await supabase.from("profiles")
            .update({ subscription_plan: planName, subscription_tier: planTier, updated_at: new Date().toISOString() })
            .eq("user_id", profile.user_id);
        } else if (["cancelled", "expired"].includes(subStatus)) {
          // Solo actualizar plan — reset de créditos ÚNICAMENTE en subscription.deleted
          await supabase.from("profiles")
            .update({ subscription_plan: "Free", subscription_tier: null, updated_at: new Date().toISOString() })
            .eq("user_id", profile.user_id);
          console.log(`[WEBHOOK] subscription.updated ${subStatus} → Free (credits preserved until subscription.deleted) for user ${profile.user_id}`);
        }

        console.log(`[WEBHOOK] subscription.updated → synced subscriptions table for user ${profile.user_id} (status=${subStatus})`);
      }
    }

    // ââ customer.subscription.deleted âââââââââââââââââââââââââââââââââ
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : (subscription.customer as any)?.id ?? "";
      const profile = await findProfileByCustomerId(supabase, stripe, customerId);

      if (profile) {
        const { data: cancelProfile } = await supabase.from("profiles").select("subscription_plan, language, available_credits, permanent_credits").eq("user_id", profile.user_id).single();
        const oldPlan = cancelProfile?.subscription_plan;
        const deletedCreditsToReset = Math.max(0, (cancelProfile?.available_credits ?? 0) - (cancelProfile?.permanent_credits ?? 0));
        await supabase.from("profiles").update({
          subscription_plan: "Free", subscription_tier: null,
          available_credits: cancelProfile?.permanent_credits ?? 0,
          updated_at: new Date().toISOString(),
        }).eq("user_id", profile.user_id);
        if (deletedCreditsToReset > 0) {
          await supabase.from("credit_transactions").insert({
            user_id: profile.user_id, amount: -deletedCreditsToReset, type: "admin_reset",
            description: `Créditos de suscripción eliminados al cancelar definitivamente: -${deletedCreditsToReset}`,
          });
        }
        console.log(`[WEBHOOK] subscription.deleted → Free, -${deletedCreditsToReset} credits for user ${profile.user_id}`);

        // ââ Sincronizar tabla subscriptions local ââ
        const deletedPriceId = subscription.items?.data?.[0]?.price?.id ?? "";
        const deletedPlanId = PRICE_TO_PLAN_ID[deletedPriceId] ?? "";
        const deletedPlanName = PLAN_ID_TO_PLAN_NAME[deletedPlanId] ?? oldPlan ?? "Annual";
        await supabase.from("subscriptions").upsert({
          user_id: profile.user_id,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          plan: deletedPlanName,
          status: "cancelled",
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        console.log(`[WEBHOOK] subscription.deleted → marked subscriptions as cancelled for user ${profile.user_id}`);

        // FIX: Crear order + evidencia IBS para la cancelacion, distinguiendo el motivo real
        try {
          const cancelReason = (subscription as any).cancellation_details?.reason || "unknown";
          const cancelProductName = cancelReason === "payment_failed"
            ? `Cancelacion por impago definitivo: ${deletedPlanName}`
            : cancelReason === "cancellation_requested"
              ? `Cancelacion por no renovacion: ${deletedPlanName}`
              : `Cancelacion de suscripcion: ${deletedPlanName}`;
          const cancelPaymentStatus = cancelReason === "payment_failed" ? "failed" : "cancelled";
          const cancelOrder = await createOrderRecord(supabase, {
            userId: profile.user_id, stripeSubscriptionId: subscription.id,
            stripeCustomerId: customerId || undefined,
            productType: deletedPlanId ? getProductType(deletedPlanId) : "monthly",
            productCode: deletedPlanId || "cancelled",
            productLabel: `${cancelReason === "payment_failed" ? "Cancelacion por impago" : cancelReason === "cancellation_requested" ? "Cancelacion por no renovacion" : "Cancelacion"}: ${deletedPlanName}`,
            billingInterval: null, amountGross: 0, stripeFee: 0, currency: "eur",
            isSubscription: true, isRenewal: false,
            metadata: { cancellation_reason: cancelReason },
            orderStatus: "cancelled",
          });
          const { data: { user: cancelEvUser } } = await supabase.auth.admin.getUserById(profile.user_id);
          const { data: cancelEvProf } = await supabase.from("profiles").select("display_name").eq("user_id", profile.user_id).single();
          await createPurchaseEvidence(supabase, {
            userId: profile.user_id, orderId: cancelOrder?.id,
            email: cancelEvUser?.email, displayName: cancelEvProf?.display_name,
            productType: "cancellation",
            productName: cancelProductName,
            amount: 0, currency: "eur", paymentStatus: cancelPaymentStatus,
          });
          console.log(`[WEBHOOK] subscription.deleted: IBS evidence created (reason=${cancelReason}) for ${profile.user_id}`);
        } catch (cancelEvErr) {
          console.warn("[WEBHOOK] subscription.deleted: failed to create cancellation evidence:", cancelEvErr);
        }

        try {
          const { data: { user: cancelUser } } = await supabase.auth.admin.getUserById(profile.user_id);
          if (cancelUser?.email) {
            await syncMailerLite("subscription.cancelled", {
              email: cancelUser.email, locale: cancelProfile?.language || "es",
              plan_type: planToMailerLiteType(oldPlan), cancellation_reason: "stripe_deleted",
            });
          }
        } catch (mlErr) { console.warn("[WEBHOOK] MailerLite cancellation sync error:", mlErr); }
      }
    }

    // ââ checkout.session.expired âââââââââââââââââââââââââââââââââââââ
    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userEmail = session.customer_email;
      const userId = session.metadata?.user_id;

      if (userEmail) {
        console.log(`[WEBHOOK] checkout.session.expired → ${userEmail}`);
        let locale = "en";
        if (userId) {
          const { data: prof } = await supabase.from("profiles").select("language").eq("user_id", userId).single();
          if (prof?.language) locale = prof.language;
        }
        const planType = session.metadata?.plan_type || "mensuales";
        try {
          await syncMailerLite("cart.abandoned", {
            email: userEmail, locale, plan_type: planType,
            amount: session.amount_total ? (session.amount_total / 100).toFixed(2) : "0",
            currency: session.currency?.toUpperCase() || "EUR",
          });
        } catch (mlErr) { console.warn("[WEBHOOK] MailerLite cart.abandoned sync error:", mlErr); }
      }
    }


    // ââ charge.dispute.created ââââââââââââââââââââââââââââââââââââââââââ
    if (event.type === "charge.dispute.created") {
      const dispute = event.data.object as Stripe.Dispute;
      const chargeId = typeof dispute.charge === "string" ? dispute.charge : (dispute.charge as any)?.id ?? "";
      const disputeId = dispute.id;

      console.log(`[WEBHOOK] Dispute created: ${disputeId} on charge ${chargeId}`);

      try {
        // Resolve customer from charge
        const charge = await stripe.charges.retrieve(chargeId);
        const customerId = typeof charge.customer === "string" ? charge.customer : (charge.customer as any)?.id ?? "";
        if (customerId) {
          const profile = await findProfileByCustomerId(supabase, stripe, customerId);
          if (profile) {
            await supabase.from("profiles").update({
              has_open_dispute: true,
              dispute_opened_at: new Date(dispute.created * 1000).toISOString(),
              dispute_stripe_id: disputeId,
              is_blocked: true,
            }).eq("user_id", profile.user_id);

            console.log(`[WEBHOOK] â Dispute flagged on user ${profile.user_id} (${disputeId})`);

            // Notificar al admin via notify-admin-alert
            try {
              const alertUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-admin-alert`;
              await fetch(alertUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                },
                body: JSON.stringify({
                  type: "dispute_opened",
                  user_id: profile.user_id,
                  dispute_id: disputeId,
                  amount: dispute.amount,
                  currency: dispute.currency,
                  reason: dispute.reason,
                }),
              });
            } catch (alertErr) {
              console.warn("[WEBHOOK] notify-admin-alert error:", alertErr);
            }
          } else {
            console.warn(`[WEBHOOK] No profile found for customer ${customerId} in dispute ${disputeId}`);
          }
        }
      } catch (dispErr) {
        console.error(`[WEBHOOK] Error processing dispute.created ${disputeId}:`, dispErr);
      }
    }


    // -- charge.dispute.updated -- safety net si created se perdio ------
    if (event.type === "charge.dispute.updated") {
      const dispute = event.data.object as Stripe.Dispute;
      const chargeId = typeof dispute.charge === "string" ? dispute.charge : (dispute.charge as any)?.id ?? "";
      const disputeId = dispute.id;
      const disputeStatus = dispute.status;

      // Solo actuar si la disputa sigue abierta (not won, not lost)
      if (disputeStatus !== "won" && disputeStatus !== "lost") {
        console.log(`[WEBHOOK] Dispute updated: ${disputeId} status=${disputeStatus}`);
        try {
          const charge = await stripe.charges.retrieve(chargeId);
          const customerId = typeof charge.customer === "string" ? charge.customer : (charge.customer as any)?.id ?? "";
          if (customerId) {
            const profile = await findProfileByCustomerId(supabase, stripe, customerId);
            if (profile) {
              const { data: existing } = await supabase
                .from("profiles")
                .select("has_open_dispute")
                .eq("user_id", profile.user_id)
                .single();

              if (!existing?.has_open_dispute) {
                await supabase.from("profiles").update({
                  has_open_dispute: true,
                  dispute_stripe_id: disputeId,
                  dispute_opened_at: new Date(dispute.created * 1000).toISOString(),
                  is_blocked: true,
                }).eq("user_id", profile.user_id);
                console.log(`[WEBHOOK] Dispute.updated safety net -- flagged user ${profile.user_id} (${disputeId}, status=${disputeStatus})`);
              } else {
                console.log(`[WEBHOOK] Dispute.updated -- user ${profile.user_id} already flagged, skipping`);
              }
            }
          }
        } catch (dispErr) {
          console.error(`[WEBHOOK] Error processing dispute.updated ${disputeId}:`, dispErr);
        }
      }
    }

    // ââ charge.dispute.lost âââââââââââââââââââââââââââââââââââââââââââââ
    if (event.type === "charge.dispute.lost") {
      const dispute = event.data.object as Stripe.Dispute;
      const chargeId = typeof dispute.charge === "string" ? dispute.charge : (dispute.charge as any)?.id ?? "";
      const disputeId = dispute.id;

      console.log(`[WEBHOOK] Dispute LOST: ${disputeId}`);

      try {
        const charge = await stripe.charges.retrieve(chargeId);
        const customerId = typeof charge.customer === "string" ? charge.customer : (charge.customer as any)?.id ?? "";
        if (customerId) {
          const profile = await findProfileByCustomerId(supabase, stripe, customerId);
          if (profile) {
            // Cancelar suscripción activa si Stripe no lo hizo automáticamente
            const { data: subs } = await supabase
              .from("subscriptions")
              .select("stripe_subscription_id, status")
              .eq("user_id", profile.user_id)
              .in("status", ["active", "past_due"])
              .limit(1);

            if (subs && subs.length > 0 && subs[0].stripe_subscription_id) {
              try {
                await stripe.subscriptions.cancel(subs[0].stripe_subscription_id);
                console.log(`[WEBHOOK] Subscription ${subs[0].stripe_subscription_id} cancelled due to lost dispute`);
              } catch (cancelErr: any) {
                // Ignorar si ya está cancelada
                if (!cancelErr.message?.includes("No such subscription")) {
                  console.warn("[WEBHOOK] Error cancelling sub on dispute lost:", cancelErr);
                }
              }
            }

            // Downgrade a Free y quitar créditos
            await supabase.from("profiles").update({
              subscription_plan: "Free",
              subscription_tier: null,
              available_credits: 0,
              permanent_credits: 0,
              has_open_dispute: true,
              dispute_lost_at: new Date().toISOString(),
              is_blocked: true,
            }).eq("user_id", profile.user_id);

            console.log(`[WEBHOOK] â User ${profile.user_id} downgraded to Free after lost dispute ${disputeId}`);

            // Notificar al admin
            try {
              const alertUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-admin-alert`;
              await fetch(alertUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                },
                body: JSON.stringify({
                  type: "dispute_lost",
                  user_id: profile.user_id,
                  dispute_id: disputeId,
                  amount: dispute.amount,
                  currency: dispute.currency,
                }),
              });
            } catch (alertErr) {
              console.warn("[WEBHOOK] notify-admin-alert error:", alertErr);
            }
          }
        }
      } catch (dispErr) {
        console.error(`[WEBHOOK] Error processing dispute.lost ${disputeId}:`, dispErr);
      }
    }

    // ââ charge.dispute.won ââââââââââââââââââââââââââââââââââââââââââââââ
    if (event.type === "charge.dispute.won") {
      const dispute = event.data.object as Stripe.Dispute;
      const chargeId = typeof dispute.charge === "string" ? dispute.charge : (dispute.charge as any)?.id ?? "";
      const disputeId = dispute.id;

      console.log(`[WEBHOOK] Dispute WON: ${disputeId}`);

      try {
        const charge = await stripe.charges.retrieve(chargeId);
        const customerId = typeof charge.customer === "string" ? charge.customer : (charge.customer as any)?.id ?? "";
        if (customerId) {
          const profile = await findProfileByCustomerId(supabase, stripe, customerId);
          if (profile) {
            // Limpiar flags de disputa (el bloqueo lo desactiva admin manualmente si procede)
            await supabase.from("profiles").update({
              has_open_dispute: false,
              dispute_stripe_id: null,
              dispute_opened_at: null,
            }).eq("user_id", profile.user_id);

            console.log(`[WEBHOOK] â Dispute won — flags cleared for user ${profile.user_id}`);
          }
        }
      } catch (dispErr) {
        console.error(`[WEBHOOK] Error processing dispute.won ${disputeId}:`, dispErr);
      }
    }

    return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[WEBHOOK] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), { headers: { "Content-Type": "application/json" }, status: 400 });
  }
});

// FIX 2026-07-22: diagnostico persistente para el bug intermitente
// "subscription_plan=Monthly/subscription_tier=null tras comprar annual_20
// /annual_100" (documentado sin reproducir desde 2026-07-15/16, segunda
// ocurrencia confirmada con yaugika@gmail.com el 2026-07-22). Los logs de
// Supabase solo retienen ~24h, insuficiente para un bug intermitente y poco
// frecuente. Se persiste la resolucion de precio/plan de cada compra de
// suscripcion en stripe_price_resolution_log (best-effort, nunca bloquea
// ni rompe el flujo principal si falla).
async function logPriceResolution(supabase: any, params: {
  sourceEvent: string;
  sessionOrInvoiceId?: string | null;
  customerId?: string | null;
  userId?: string | null;
  resolvedPriceId?: string | null;
  resolvedPlanId?: string | null;
  resolvedPlanName?: string | null;
  lineItemsRaw?: unknown;
}) {
  try {
    await supabase.from("stripe_price_resolution_log").insert({
      source_event: params.sourceEvent,
      session_or_invoice_id: params.sessionOrInvoiceId ?? null,
      stripe_customer_id: params.customerId ?? null,
      user_id: params.userId ?? null,
      resolved_price_id: params.resolvedPriceId ?? null,
      resolved_plan_id: params.resolvedPlanId ?? null,
      resolved_plan_name: params.resolvedPlanName ?? null,
      line_items_raw: params.lineItemsRaw ?? null,
    });
  } catch (e) {
    console.warn("[WEBHOOK] logPriceResolution failed (non-blocking):", e);
  }
}

async function addCredits(supabase: any, userId: string, credits: number, description: string) {
  await supabase.from("credit_transactions").insert({ user_id: userId, amount: credits, type: "purchase", description });
  const { data: profile } = await supabase.from("profiles").select("available_credits").eq("user_id", userId).single();
  if (profile) {
    await supabase.from("profiles").update({ available_credits: profile.available_credits + credits }).eq("user_id", userId);
  }
  console.log(`[WEBHOOK] Added ${credits} credits to user ${userId}`);
}
