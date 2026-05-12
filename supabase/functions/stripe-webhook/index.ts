import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFINITIVE_DECLINE_CODES = new Set([
  "previously_declined_do_not_retry",
  "do_not_honor_do_not_retry",
  "stolen_card",
  "lost_card",
  "card_velocity_exceeded",
  "fraudulent",
  "pickup_card",
]);

async function syncMailerLite(event: string, payload: Record<string, any>) {
  try {
    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/mailerlite-webhook-handler`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({ event, ...payload }),
    });
    if (!res.ok) console.warn(`[ML-SYNC] ${event} failed ${res.status}`);
    else console.log(`[ML-SYNC] ✅ ${event}`);
  } catch (e) { console.warn(`[ML-SYNC] ${event} error:`, e); }
}

function planToMLType(plan?: string) {
  if (!plan) return "single";
  const p = plan.toLowerCase();
  if (p.includes("annual") || p.includes("anual")) return "anuales";
  if (p.includes("month") || p.includes("mensual")) return "mensuales";
  return "single";
}

const PRICE_CREDITS: Record<string, number> = {
  "price_1T9TnyF9ZCIiqrz6ruOlBcnZ": 120,
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
  "price_1T8n6lFULeu7PzK60TbO76hE": 8,
  "price_1T8n6CFULeu7PzK6vs7NZyiJ": 100,
  "price_1TMapTFULeu7PzK640B5uuEq": 200,
  "price_1TMapTFULeu7PzK6D4GnB3Il": 300,
  "price_1TMapTFULeu7PzK6cNJMf2oL": 500,
  "price_1TMapTFULeu7PzK6ziUW5fLn": 1000,
};

const PRICE_PLAN: Record<string, string> = {
  "price_1T9TnyF9ZCIiqrz6ruOlBcnZ": "Annual",
  "price_1THT7cF9ZCIiqrz6sWS67Q4V": "Annual",
  "price_1THT7gF9ZCIiqrz6Acb2CkDC": "Annual",
  "price_1THT7jF9ZCIiqrz6i02J4bj4": "Annual",
  "price_1THT7nF9ZCIiqrz6r1ZcqH8L": "Annual",
  "price_1THT7rF9ZCIiqrz6UmJDkBNZ": "Annual",
  "price_1T9SZvF9ZCIiqrz6TWLtfMBs": "Monthly",
  "price_1T8n6lFULeu7PzK60TbO76hE": "Monthly",
  "price_1T8n6CFULeu7PzK6vs7NZyiJ": "Annual",
  "price_1TMapTFULeu7PzK640B5uuEq": "Annual",
  "price_1TMapTFULeu7PzK6D4GnB3Il": "Annual",
  "price_1TMapTFULeu7PzK6cNJMf2oL": "Annual",
  "price_1TMapTFULeu7PzK6ziUW5fLn": "Annual",
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
  "price_1T8n6lFULeu7PzK60TbO76hE": "monthly",
  "price_1T8n6CFULeu7PzK6vs7NZyiJ": "annual_100",
  "price_1TMapTFULeu7PzK640B5uuEq": "annual_200",
  "price_1TMapTFULeu7PzK6D4GnB3Il": "annual_300",
  "price_1TMapTFULeu7PzK6cNJMf2oL": "annual_500",
  "price_1TMapTFULeu7PzK6ziUW5fLn": "annual_1000",
};

const PLAN_ID_TO_PLAN_NAME: Record<string, string> = {
  annual_100: "Annual", annual_200: "Annual", annual_300: "Annual",
  annual_500: "Annual", annual_1000: "Annual", annual_legacy: "Annual",
  monthly: "Monthly",
};

function getProductType(planId: string): string {
  if (planId.startsWith("annual")) return "annual";
  if (planId === "monthly") return "monthly";
  if (planId === "individual") return "single";
  if (planId.startsWith("topup_")) return "topup";
  return "unknown";
}

function mapStripeStatus(s: string): string {
  if (["active", "trialing"].includes(s)) return "active";
  if (["past_due", "unpaid"].includes(s)) return "past_due";
  if (["canceled", "incomplete_expired"].includes(s)) return "cancelled";
  return "past_due";
}

async function findProfile(supabase: any, stripe: any, customerId: string) {
  const { data: p } = await supabase.from("profiles").select("user_id, available_credits").eq("stripe_customer_id", customerId).single();
  if (p) return p;
  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
  if (customer.email) {
    const { data: au } = await supabase.auth.admin.getUserByEmail(customer.email);
    if (au?.user) {
      await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("user_id", au.user.id);
      const { data: p2 } = await supabase.from("profiles").select("user_id, available_credits").eq("user_id", au.user.id).single();
      return p2;
    }
  }
  return null;
}

function invCustomerId(inv: any): string {
  return typeof inv.customer === "string" ? inv.customer : inv.customer?.id ?? "";
}

async function createOrder(supabase: any, params: any) {
  try {
    const { count } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", params.userId);
    const meta = params.metadata || {};
    let campaignId: string | null = null, campaignName: string | null = meta.attributed_campaign_name || null;
    if (meta.utm_campaign) { const { data: c } = await supabase.from("marketing_campaigns").select("id,name").eq("utm_campaign", meta.utm_campaign).limit(1).maybeSingle(); if (c) { campaignId = c.id; campaignName = c.name; } }
    if (!campaignId && params.couponCode) { const { data: c } = await supabase.from("marketing_campaigns").select("id,name").eq("coupon_code", params.couponCode).limit(1).maybeSingle(); if (c) { campaignId = c.id; campaignName = c.name; } }
    const { data: order, error } = await supabase.from("orders").insert({ user_id: params.userId, stripe_checkout_session_id: params.sessionId || null, stripe_invoice_id: params.invoiceId || null, stripe_subscription_id: params.subId || null, stripe_payment_intent_id: params.piId || null, product_type: params.productType, product_code: params.productCode, product_label: params.productLabel, billing_interval: params.billingInterval, quantity: 1, amount_gross: params.amount, currency: params.currency, is_subscription: params.isSub, is_renewal: params.isRenewal, is_first_purchase: (count || 0) === 0, coupon_code: params.couponCode || null, campaign_id: campaignId, attributed_campaign_name: campaignName, utm_source: meta.utm_source || null, utm_medium: meta.utm_medium || null, utm_campaign: meta.utm_campaign || null, metadata: meta, paid_at: new Date().toISOString() }).select("id").single();
    if (error) { console.error("[WEBHOOK] Order error:", error.message); return null; }
    if (order) await supabase.from("order_attribution").insert({ order_id: order.id, campaign_id: campaignId, attributed_campaign_name: campaignName, source: meta.utm_source || null, medium: meta.utm_medium || null, campaign: meta.utm_campaign || null });
    return order;
  } catch (e: any) { console.error("[WEBHOOK] createOrder:", e.message); return null; }
}

async function createEvidence(supabase: any, params: any) {
  try {
    const payload = { user_id: params.userId, email: params.email, display_name: params.displayName, product_type: params.productType, product_name: params.productName, amount: params.amount, currency: params.currency, payment_provider: "stripe", payment_intent_id: params.piId, checkout_session_id: params.sessionId, payment_status: params.status || "succeeded", accepted_terms: params.acceptedTerms, purchase_timestamp: new Date().toISOString() };
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(payload, Object.keys(payload).sort())));
    const hashHex = new TextDecoder().decode(hexEncode(new Uint8Array(hashBuffer)));
    const { data: ev } = await supabase.from("purchase_evidences").insert({ ...payload, order_id: params.orderId || null, evidence_payload_json: payload, evidence_hash: hashHex, certification_status: "pending" }).select("id").single();
    if (ev?.id) fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/certify-purchase`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` }, body: JSON.stringify({ evidence_id: ev.id }) }).catch(() => {});
    return ev;
  } catch (e: any) { console.error("[WEBHOOK] createEvidence:", e.message); return null; }
}

async function addCredits(supabase: any, userId: string, credits: number, description: string, audit: any = {}) {
  await supabase.from("credit_transactions").insert({ user_id: userId, amount: credits, type: "purchase", description, stripe_session_id: audit.sessionId || null, coupon_code: audit.couponCode || null, order_id: audit.orderId || null });
  const { data: p } = await supabase.from("profiles").select("available_credits").eq("user_id", userId).single();
  if (p) await supabase.from("profiles").update({ available_credits: p.available_credits + credits }).eq("user_id", userId);
}

async function handleDefinitiveDecline(supabase: any, stripe: any, customerId: string, declineCode: string) {
  const profile = await findProfile(supabase, stripe, customerId);
  if (!profile) return;
  const { data: profileData } = await supabase.from("profiles").select("subscription_plan, language, available_credits").eq("user_id", profile.user_id).single();
  if (!profileData || profileData.subscription_plan === "Free") return;
  console.log(`[WEBHOOK] Definitive decline (${declineCode}) for user ${profile.user_id}`);
  await supabase.from("profiles").update({ subscription_plan: "Free", available_credits: 0, updated_at: new Date().toISOString() }).eq("user_id", profile.user_id);
  await supabase.from("subscriptions").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("user_id", profile.user_id).in("status", ["active", "past_due"]);
  await supabase.from("credit_transactions").insert({ user_id: profile.user_id, amount: 0, type: "admin_adjustment", description: `Baja automatica por rechazo definitivo del banco (${declineCode})` });
  try {
    const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
    if (subs.data.length > 0) await stripe.subscriptions.cancel(subs.data[0].id);
  } catch (e) { console.warn("[WEBHOOK] Could not cancel Stripe subscription:", e); }
  try {
    const { data: { user: au } } = await supabase.auth.admin.getUserById(profile.user_id);
    const userEmail = au?.email;
    if (userEmail) {
      const rawLang = (profileData.language || "es").toLowerCase();
      const lang: "es" | "en" | "pt" = rawLang.startsWith("pt") ? "pt" : rawLang.startsWith("en") ? "en" : "es";
      const subjects = { es: "Tu suscripcion ha sido cancelada - MusicDibs", en: "Your subscription has been cancelled - MusicDibs", pt: "Sua assinatura foi cancelada - MusicDibs" };
      const messages = { es: `Tu banco ha rechazado definitivamente el cobro (codigo: ${declineCode}). Hemos cancelado tu suscripcion y puesto tus creditos a 0.`, en: `Your bank definitively declined the charge (code: ${declineCode}). We have cancelled your subscription and set credits to 0.`, pt: `Seu banco recusou definitivamente a cobranca (codigo: ${declineCode}). Cancelamos sua assinatura e zeramos seus creditos.` };
      const ctas = { es: "Ver planes", en: "View plans", pt: "Ver planos" };
      const html = `<h2>${subjects[lang]}</h2><p>${messages[lang]}</p><p><a href="https://musicdibs.com/dashboard/credits">${ctas[lang]} →</a></p>`;
      await supabase.rpc("enqueue_email", { queue_name: "transactional_emails", payload: { idempotency_key: `definitive-decline-${profile.user_id}-${declineCode}`, message_id: crypto.randomUUID(), to: userEmail, from: "MusicDibs <noreply@notify.musicdibs.com>", sender_domain: "notify.musicdibs.com", subject: subjects[lang], html, purpose: "transactional", label: "definitive_decline", queued_at: new Date().toISOString() } });
      await syncMailerLite("subscription.cancelled", { email: userEmail, locale: profileData.language || "es", plan_type: planToMLType(profileData.subscription_plan), cancellation_reason: "definitive_bank_decline" });
    }
  } catch (e) { console.warn("[WEBHOOK] Definitive decline email error:", e); }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!secret || !sig) return new Response(JSON.stringify({ error: "Missing config" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const event = await stripe.webhooks.constructEventAsync(body, sig, secret);
    console.log(`[WEBHOOK] ${event.type}`);

    // charge.failed → baja automatica si rechazo definitivo
    if (event.type === "charge.failed") {
      const charge = event.data.object as Stripe.Charge;
      const declineCode = charge.failure_code || "";
      const customerId = typeof charge.customer === "string" ? charge.customer : (charge.customer as any)?.id;
      if (customerId && DEFINITIVE_DECLINE_CODES.has(declineCode)) {
        await handleDefinitiveDecline(supabase, stripe, customerId, declineCode);
      } else if (customerId) {
        const profile = await findProfile(supabase, stripe, customerId);
        if (profile) await supabase.from("credit_transactions").insert({ user_id: profile.user_id, amount: 0, type: "payment_failed", description: `Fallo de cobro: ${declineCode || "unknown"}` });
      }
    }

    // checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      let userId = session.metadata?.user_id || "";
      const credits = parseInt(session.metadata?.credits || "0", 10);
      const planId = session.metadata?.plan_id || "unknown";

      // Guest checkout fallback
      if (!userId) {
        const guestEmail = (session.metadata?.guest_email || (session.customer_details as any)?.email || "").toString().trim().toLowerCase();
        if (guestEmail) {
          console.log(`[WEBHOOK] Guest checkout - resolving user for ${guestEmail}`);
          try {
            let page = 1;
            while (!userId && page <= 50) {
              const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
              if (listErr || !list?.users?.length) break;
              const found = list.users.find((u: any) => (u.email || "").toLowerCase() === guestEmail);
              if (found) { userId = found.id; break; }
              if (list.users.length < 200) break;
              page++;
            }
          } catch (e) { console.warn("[WEBHOOK] guest user lookup failed:", e); }
          if (!userId) {
            try {
              const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/register-guest-lead`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
                body: JSON.stringify({ email: guestEmail, language: session.metadata?.language || "es" }),
              });
              if (res.ok) { const j = await res.json().catch(() => ({})); if (j?.userId) userId = j.userId; }
            } catch (e) { console.warn("[WEBHOOK] register-guest-lead failed:", e); }
          }
          if (userId) console.log(`[WEBHOOK] Guest checkout resolved to user ${userId}`);
          else console.error(`[WEBHOOK] Could not resolve user for guest email ${guestEmail}`);
        }
      }

      if (userId && credits > 0) {
        const { data: eo } = await supabase.from("orders").select("id").eq("stripe_checkout_session_id", session.id).maybeSingle();
        if (eo) return new Response(JSON.stringify({ received: true, duplicate: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

        const { data: pp } = await supabase.from("profiles").select("subscription_plan").eq("user_id", userId).single();
        const prevPlan = pp?.subscription_plan || "Free";
        const planName = PLAN_ID_TO_PLAN_NAME[planId];
        if (planName) await supabase.from("profiles").update({ subscription_plan: planName }).eq("user_id", userId);

        let custId: string | undefined;
        if (session.customer) { custId = typeof session.customer === "string" ? session.customer : (session.customer as any).id; await supabase.from("profiles").update({ stripe_customer_id: custId }).eq("user_id", userId); }

        const meta = session.metadata || {};
        const amount = session.amount_total ? session.amount_total / 100 : 0;
        const subId = typeof session.subscription === "string" ? session.subscription : (session.subscription as any)?.id || null;
        const piId = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent as any)?.id || null;
        let couponCode: string | undefined;
        try { const es = await stripe.checkout.sessions.retrieve(session.id, { expand: ["total_details.breakdown.discounts"] }); const d = (es.total_details as any)?.breakdown?.discounts?.[0]; couponCode = d?.discount?.coupon?.id; } catch { }

        const order = await createOrder(supabase, { userId, sessionId: session.id, subId, piId, productType: meta.product_type || getProductType(planId), productCode: meta.product_code || planId, productLabel: meta.product_label || planId, billingInterval: meta.billing_interval || null, amount, currency: session.currency || "eur", isSub: !!subId, isRenewal: false, couponCode, metadata: meta });
        await addCredits(supabase, userId, credits, `Compra plan ${planId}: +${credits} creditos`, { sessionId: session.id, couponCode, orderId: order?.id });

        try {
          const { data: { user: au } } = await supabase.auth.admin.getUserById(userId);
          const { data: dp } = await supabase.from("profiles").select("display_name, language").eq("user_id", userId).single();
          await createEvidence(supabase, { userId, orderId: order?.id, email: au?.email, displayName: dp?.display_name || au?.email, productType: meta.product_type || getProductType(planId), productName: meta.product_label || planId, amount, piId, sessionId: session.id, acceptedTerms: meta.accepted_terms === "true", status: "succeeded" });
          if (au?.email) {
            const lang = dp?.language || "es";
            const subjects: Record<string, string> = { es: `Compra confirmada - ${planName || planId} (+${credits} creditos)`, en: `Purchase confirmed - ${planName || planId} (+${credits} credits)`, pt: `Compra confirmada - ${planName || planId} (+${credits} creditos)` };
            const msgId = crypto.randomUUID();
            await supabase.rpc("enqueue_email", { queue_name: "transactional_emails", payload: { idempotency_key: `credit-purchase-${msgId}`, message_id: msgId, to: au.email, from: "MusicDibs <noreply@notify.musicdibs.com>", sender_domain: "notify.musicdibs.com", subject: subjects[lang] || subjects.es, html: `<h2>Compra confirmada</h2><p>Plan: ${planName || planId} | Creditos: +${credits}</p><p><a href="https://musicdibs.com/dashboard/credits">Ver mis creditos</a></p>`, text: `Compra confirmada. Plan: ${planName || planId}. Creditos: +${credits}`, purpose: "transactional", label: "credit_purchase", queued_at: new Date().toISOString() } });
          }
          const isTopUp = planId.startsWith("topup_") || planId === "individual";
          if (!isTopUp && au?.email) await syncMailerLite("purchase.completed", { email: au.email, locale: dp?.language || "es", plan_type: planToMLType(planName || planId), stripe_customer_id: custId || "" });
          const ANNUAL_IDS = ["annual_100", "annual_200", "annual_300", "annual_500", "annual_1000"];
          if (ANNUAL_IDS.includes(planId) && prevPlan !== "Annual" && au?.email) {
            const distMsgId = crypto.randomUUID();
            await supabase.rpc("enqueue_email", { queue_name: "transactional_emails", payload: { idempotency_key: `dist-onboard-${userId}-${planId}`, message_id: distMsgId, to: "marketing@musicdibs.com", cc: "info@musicdibs.com", from: "MusicDibs <noreply@notify.musicdibs.com>", sender_domain: "notify.musicdibs.com", subject: "Nuevo alta en Distribucion", html: `<h2>Nuevo alta</h2><p>Email: ${au.email}, Plan: ${planId}, Creditos: ${credits}</p>`, text: `Nuevo alta. Email: ${au.email}, Plan: ${planId}`, purpose: "transactional", label: "distribution_onboarding", queued_at: new Date().toISOString() } });
          }
        } catch (e) { console.error("[WEBHOOK] Post-purchase error:", e); }
      }
    }

    // invoice.payment_succeeded
    if (event.type === "invoice.payment_succeeded" || event.type === "invoice_payment.paid") {
      const obj = event.data.object as any;
      let custId = "", billingReason: string | null = null, priceId: string | undefined, invoiceId: string | undefined, subId: string | undefined, amount = 0, currency = "eur";
      if (event.type === "invoice_payment.paid") {
        const invId = typeof obj.invoice === "string" ? obj.invoice : obj.invoice?.id;
        if (!invId) return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const inv = await stripe.invoices.retrieve(invId);
        custId = invCustomerId(inv); billingReason = inv.billing_reason as string | null; priceId = inv.lines?.data?.[0]?.price?.id; invoiceId = invId;
        subId = typeof inv.subscription === "string" ? inv.subscription : (inv.subscription as any)?.id;
        amount = (inv.amount_paid || 0) / 100; currency = inv.currency || "eur";
      } else {
        const inv = obj;
        custId = invCustomerId(inv); billingReason = inv.billing_reason; priceId = inv.lines?.data?.[0]?.price?.id; invoiceId = inv.id;
        subId = typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id;
        amount = (inv.amount_paid || 0) / 100; currency = inv.currency || "eur";
      }
      if (billingReason === "subscription_cycle") {
        const profile = await findProfile(supabase, stripe, custId);
        if (profile) {
          if (invoiceId) { const { data: er } = await supabase.from("orders").select("id").eq("stripe_invoice_id", invoiceId).eq("is_renewal", true).maybeSingle(); if (er) return new Response(JSON.stringify({ received: true, duplicate: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
          const credits = priceId ? (PRICE_CREDITS[priceId] || 0) : 0;
          if (credits > 0) { await supabase.from("profiles").update({ available_credits: credits }).eq("user_id", profile.user_id); await supabase.from("credit_transactions").insert({ user_id: profile.user_id, amount: credits, type: "renewal", description: `Renovacion: creditos reiniciados a ${credits}` }); }
          const planId = priceId ? (PRICE_TO_PLAN_ID[priceId] || "unknown") : "unknown";
          await createOrder(supabase, { userId: profile.user_id, invoiceId, subId, productType: getProductType(planId), productCode: planId, productLabel: `Renovacion ${planId}`, billingInterval: planId.startsWith("annual") ? "yearly" : "monthly", amount, currency, isSub: true, isRenewal: true, metadata: {} });
        }
      }
      if (billingReason === "subscription_update") {
        const profile = await findProfile(supabase, stripe, custId);
        if (profile) {
          let actualPriceId = priceId;
          if (subId) { try { const s = await stripe.subscriptions.retrieve(subId); actualPriceId = s.items?.data?.[0]?.price?.id || priceId; } catch { } }
          const credits = actualPriceId ? (PRICE_CREDITS[actualPriceId] || 0) : 0;
          if (credits > 0) await addCredits(supabase, profile.user_id, credits, `Cambio de plan: +${credits} creditos`);
          const planId = actualPriceId ? (PRICE_TO_PLAN_ID[actualPriceId] || null) : null;
          const planName = planId ? (PLAN_ID_TO_PLAN_NAME[planId] || null) : null;
          if (planName) await supabase.from("profiles").update({ subscription_plan: planName }).eq("user_id", profile.user_id);
        }
      }
    }

    // invoice.payment_failed
    if (event.type === "invoice.payment_failed" || event.type === "invoice_payment.failed") {
      const obj = event.data.object as any;
      let custId = "", attemptCount = 0, nextAttempt: string | null = null;
      if (event.type === "invoice_payment.failed") {
        const invId = typeof obj.invoice === "string" ? obj.invoice : obj.invoice?.id;
        if (!invId) return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const inv = await stripe.invoices.retrieve(invId);
        custId = invCustomerId(inv); attemptCount = inv.attempt_count ?? 0;
        nextAttempt = inv.next_payment_attempt ? new Date((inv.next_payment_attempt as number) * 1000).toISOString() : null;
      } else {
        custId = invCustomerId(obj); attemptCount = obj.attempt_count;
        nextAttempt = obj.next_payment_attempt ? new Date(obj.next_payment_attempt * 1000).toISOString() : null;
      }
      const profile = await findProfile(supabase, stripe, custId);
      if (profile) {
        const desc = `Fallo en cobro de suscripcion (intento ${attemptCount})${nextAttempt ? `. Proximo reintento: ${nextAttempt}` : ". No hay mas reintentos."}`;
        await supabase.from("credit_transactions").insert({ user_id: profile.user_id, amount: 0, type: "payment_failed", description: desc });
        try {
          const customer = await stripe.customers.retrieve(custId) as Stripe.Customer;
          const userEmail = customer.email || "";
          if (userEmail) {
            const { data: pd } = await supabase.from("profiles").select("language").eq("user_id", profile.user_id).single();
            const lang = pd?.language || "es";
            const subjects: Record<string, string> = { es: "Fallo en el cobro de tu suscripcion - MusicDibs", en: "Subscription payment failed - MusicDibs", pt: "Falha no pagamento da assinatura - MusicDibs" };
            const msgId = crypto.randomUUID();
            await supabase.rpc("enqueue_email", { queue_name: "transactional_emails", payload: { idempotency_key: `payment-failed-${msgId}`, message_id: msgId, to: userEmail, from: "MusicDibs <noreply@notify.musicdibs.com>", sender_domain: "notify.musicdibs.com", subject: subjects[lang] || subjects.es, html: `<h2>Fallo en el cobro</h2><p>${desc}</p><p><a href="https://musicdibs.com/dashboard/billing">Actualizar metodo de pago</a></p>`, text: desc, purpose: "transactional", label: "payment_failed", queued_at: new Date().toISOString() } });
            const adminId = crypto.randomUUID();
            await supabase.rpc("enqueue_email", { queue_name: "transactional_emails", payload: { idempotency_key: `payment-failed-admin-${adminId}`, message_id: adminId, to: "info@musicdibs.com", from: "MusicDibs <noreply@notify.musicdibs.com>", sender_domain: "notify.musicdibs.com", subject: `Fallo de pago - ${userEmail}`, html: `<h2>Fallo de pago</h2><p>Email: ${userEmail}<br>${desc}</p>`, text: desc, purpose: "transactional", label: "payment_failed_admin", queued_at: new Date().toISOString() } });
          }
        } catch (e) { console.error("[WEBHOOK] payment_failed email error:", e); }
      }
    }

    // customer.subscription.updated
    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      const custId = typeof sub.customer === "string" ? sub.customer : (sub.customer as any)?.id ?? "";
      const priceId = sub.items?.data?.[0]?.price?.id;
      const profile = await findProfile(supabase, stripe, custId);
      if (profile) {
        const planName = priceId ? (PRICE_PLAN[priceId] || null) : null;
        const subStatus = mapStripeStatus(sub.status);
        const periodStart = (sub as any).current_period_start ? new Date((sub as any).current_period_start * 1000).toISOString() : null;
        const periodEnd = (sub as any).current_period_end ? new Date((sub as any).current_period_end * 1000).toISOString() : null;
        await supabase.from("subscriptions").upsert({ user_id: profile.user_id, stripe_customer_id: custId, plan: planName || "Annual", status: subStatus, current_period_start: periodStart, current_period_end: periodEnd, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
        if (subStatus === "active" && planName) await supabase.from("profiles").update({ subscription_plan: planName, updated_at: new Date().toISOString() }).eq("user_id", profile.user_id);
        else if (["cancelled", "expired"].includes(subStatus)) await supabase.from("profiles").update({ subscription_plan: "Free", updated_at: new Date().toISOString() }).eq("user_id", profile.user_id);
      }
    }

    // customer.subscription.deleted
    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const custId = typeof sub.customer === "string" ? sub.customer : (sub.customer as any)?.id ?? "";
      const profile = await findProfile(supabase, stripe, custId);
      if (profile) {
        const { data: cp } = await supabase.from("profiles").select("subscription_plan, language").eq("user_id", profile.user_id).single();
        const oldPlan = cp?.subscription_plan;
        await supabase.from("profiles").update({ subscription_plan: "Free" }).eq("user_id", profile.user_id);
        await supabase.from("subscriptions").upsert({ user_id: profile.user_id, stripe_customer_id: custId, plan: "Annual", status: "cancelled", updated_at: new Date().toISOString() }, { onConflict: "user_id" });
        let cancelEmail: string | null = null;
        try { const { data: { user: au } } = await supabase.auth.admin.getUserById(profile.user_id); cancelEmail = au?.email ?? null; if (au?.email) await syncMailerLite("subscription.cancelled", { email: au.email, locale: cp?.language || "es", plan_type: planToMLType(oldPlan), cancellation_reason: "stripe_deleted" }); } catch (e) { console.warn("[WEBHOOK] ML cancellation error:", e); }
        try {
          const byNonPayment = (sub as any).cancellation_details?.reason === "payment_failed" || (sub as any).latest_invoice !== null;
          if (byNonPayment && cancelEmail) {
            const lang = (cp?.language || "es").toLowerCase().startsWith("pt") ? "pt" : (cp?.language || "es").toLowerCase().startsWith("en") ? "en" : "es";
            const subjects: Record<string, string> = { es: "Tu suscripcion ha sido cancelada por impago - MusicDibs", en: "Your subscription has been cancelled due to non-payment - MusicDibs", pt: "Sua assinatura foi cancelada por falta de pagamento - MusicDibs" };
            const msgs: Record<string, string> = { es: "Despues de varios intentos fallidos, tu suscripcion ha sido cancelada. Puedes reactivarla contratando un nuevo plan.", en: "After several failed payment attempts, your subscription has been cancelled. You can reactivate it by subscribing to a new plan.", pt: "Apos varias tentativas malsucedidas, sua assinatura foi cancelada. Voce pode reativa-la assinando um novo plano." };
            const ctas: Record<string, string> = { es: "Ver planes", en: "View plans", pt: "Ver planos" };
            await supabase.rpc("enqueue_email", { queue_name: "transactional_emails", payload: { idempotency_key: `sub-cancelled-nonpayment-${profile.user_id}`, message_id: crypto.randomUUID(), to: cancelEmail, from: "MusicDibs <noreply@notify.musicdibs.com>", sender_domain: "notify.musicdibs.com", subject: subjects[lang], html: `<h2>${subjects[lang]}</h2><p>${msgs[lang]}</p><p><a href="https://musicdibs.com/dashboard/credits">${ctas[lang]}</a></p>`, text: msgs[lang], purpose: "transactional", label: "subscription_cancelled_nonpayment", queued_at: new Date().toISOString() } });
          }
        } catch (e) { console.warn("[WEBHOOK] Non-payment cancellation email error:", e); }
      }
    }

    // checkout.session.expired
    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userEmail = session.customer_email;
      const userId = session.metadata?.user_id;
      if (userEmail) {
        let locale = "en";
        if (userId) { const { data: p } = await supabase.from("profiles").select("language").eq("user_id", userId).single(); if (p?.language) locale = p.language; }
        await syncMailerLite("cart.abandoned", { email: userEmail, locale, plan_type: session.metadata?.plan_type || "mensuales", amount: session.amount_total ? (session.amount_total / 100).toFixed(2) : "0", currency: session.currency?.toUpperCase() || "EUR" }).catch(() => {});
      }
    }

    return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[WEBHOOK] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
  }
});
