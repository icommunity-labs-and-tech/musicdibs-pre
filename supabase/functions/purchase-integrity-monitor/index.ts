import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const EXPECTED_CREDITS: Record<string, number> = {
  annual_20: 20, annual_100: 100, annual_200: 200, annual_300: 300, annual_500: 500, annual_1000: 1000,
  monthly: 8, individual: 1, single: 1,
  topup_10: 10, topup_25: 25, topup_50: 50, topup_100: 100, topup_200: 200,
};
const SUBSCRIPTION_PRODUCT_TYPES = ["annual", "monthly"];
const NON_PURCHASE_LABEL_PREFIXES = ["Cancelacion por", "Cancelaci\u00f3n por"];

const SUMMARIZE_TYPES = new Set(["subscription_status_desincronizado"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const authHeader = req.headers.get("Authorization") || "";
  const cronHeader = req.headers.get("x-cron-secret") || "";
  const isAuth = authHeader === `Bearer ${serviceKey}` || (cronSecret && cronHeader === cronSecret);
  if (!isAuth) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

  const HOURS = 24;
  const since = new Date(Date.now() - HOURS * 60 * 60 * 1000);
  const issues: { type: string; severity: "critical" | "warning"; email: string; detail: string; charge_id?: string }[] = [];

  try {
    // ── 1. CROSS-CHECK Stripe charges succeeded vs orders en Supabase ─────────
    const charges = await stripe.charges.list({
      created: { gte: Math.floor(since.getTime() / 1000) },
      limit: 100,
    });
    const succeededCharges = charges.data.filter(c => c.status === "succeeded" && c.amount > 0);

    for (const charge of succeededCharges) {
      const customerId = typeof charge.customer === "string" ? charge.customer : charge.customer?.id;
      if (!customerId) continue;

      const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      const invoiceId = typeof (charge as any).invoice === "string" ? (charge as any).invoice : (charge as any).invoice?.id;

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      let email = "unknown";
      if (profile?.user_id) {
        const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id);
        email = user?.email || "unknown";
      }

      let order: { id: string; product_code: string | null; product_type: string | null; amount_gross: number; user_id: string } | null = null;

      {
        const { data } = await supabase
          .from("orders")
          .select("id, product_code, product_type, amount_gross, user_id")
          .or(`stripe_charge_id.eq.${charge.id}${piId ? `,stripe_payment_intent_id.eq.${piId}` : ""}`)
          .maybeSingle();
        order = data;
      }

      if (!order && invoiceId) {
        const { data } = await supabase
          .from("orders").select("id, product_code, product_type, amount_gross, user_id")
          .eq("stripe_invoice_id", invoiceId).maybeSingle();
        order = data;
      }

      if (!order && invoiceId) {
        try {
          const invoice = await stripe.invoices.retrieve(invoiceId);
          const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
          if (subId) {
            const { data } = await supabase
              .from("orders").select("id, product_code, product_type, amount_gross, user_id")
              .eq("stripe_subscription_id", subId)
              .gte("paid_at", new Date(charge.created * 1000 - 10 * 60 * 1000).toISOString())
              .lte("paid_at", new Date(charge.created * 1000 + 10 * 60 * 1000).toISOString())
              .maybeSingle();
            order = data;
          }
        } catch (e: any) {
          console.warn(`[PURCHASE-AUDIT] No se pudo obtener invoice ${invoiceId} para charge ${charge.id}:`, e?.message);
        }
      }

      if (!order && profile?.user_id) {
        const chargeAmount = charge.amount / 100;
        const { data: candidates } = await supabase
          .from("orders")
          .select("id, product_code, product_type, amount_gross, user_id")
          .eq("user_id", profile.user_id)
          .gte("paid_at", new Date(charge.created * 1000 - 15 * 60 * 1000).toISOString())
          .lte("paid_at", new Date(charge.created * 1000 + 15 * 60 * 1000).toISOString());
        order = (candidates || []).find((o) => Math.abs(Number(o.amount_gross) - chargeAmount) < 0.5) ?? null;
      }

      if (!order) {
        issues.push({
          type: "charge_sin_order", severity: "critical", email,
          detail: `Cargo Stripe ${charge.id} (€${(charge.amount / 100).toFixed(2)}) succeeded sin order en Supabase (verificado por charge_id, payment_intent_id, invoice_id, subscription_id Y customer+importe+tiempo). El webhook probablemente falló silenciosamente.`,
          charge_id: charge.id,
        });
        continue;
      }

      if (order.product_code && EXPECTED_CREDITS[order.product_code] !== undefined) {
        const expectedCredits = EXPECTED_CREDITS[order.product_code];
        const { data: creditTx } = await supabase
          .from("credit_transactions")
          .select("amount")
          .eq("user_id", order.user_id)
          .gte("created_at", new Date(charge.created * 1000 - 5 * 60 * 1000).toISOString())
          .gt("amount", 0);

        const totalCredited = (creditTx || []).reduce((s, t) => s + t.amount, 0);
        if (totalCredited < expectedCredits) {
          issues.push({
            type: "creditos_no_asignados", severity: "critical", email,
            detail: `Compra ${order.product_code} (€${(charge.amount / 100).toFixed(2)}) — esperados ${expectedCredits} creditos, encontrados ${totalCredited} desde el cargo hasta ahora. Verificar si sigue pendiente.`,
            charge_id: charge.id,
          });
        }
      }
    }

    // ── 2. Verificar plan/tier coherente con la ultima compra ──────────────
    const { data: recentOrders } = await supabase
      .from("orders")
      .select("user_id, product_code, product_type, product_label, amount_gross, is_subscription, paid_at")
      .gte("paid_at", since.toISOString())
      .eq("is_subscription", true)
      .eq("is_renewal", false);

    for (const o of recentOrders || []) {
      const label = (o as any).product_label as string | null;
      const isNonPurchase = (label && NON_PURCHASE_LABEL_PREFIXES.some((p) => label.startsWith(p))) || Number(o.amount_gross) === 0;
      if (isNonPurchase) continue;

      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_plan, subscription_tier")
        .eq("user_id", o.user_id)
        .maybeSingle();
      if (!profile) continue;
      if (o.product_code && o.product_code !== "unknown" && profile.subscription_tier !== o.product_code) {
        const { data: { user } } = await supabase.auth.admin.getUserById(o.user_id);
        issues.push({
          type: "tier_desincronizado", severity: "warning", email: user?.email || "unknown",
          detail: `Compró ${o.product_code} pero profile.subscription_tier = ${profile.subscription_tier}`,
        });
      }
    }

    // ── 2b. Cambios de plan (upgrade/downgrade) desincronizados con Stripe ────
    const { data: planChanges } = await supabase
      .from("credit_transactions")
      .select("user_id, amount, description, created_at")
      .eq("type", "subscription")
      .ilike("description", "Cambio de plan:%")
      .gte("created_at", since.toISOString());

    const planChangeUserIds = [...new Set((planChanges || []).map((t: any) => t.user_id))];

    for (const userId of planChangeUserIds) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_customer_id, subscription_tier, subscription_plan, available_credits, permanent_credits")
        .eq("user_id", userId)
        .maybeSingle();
      if (!profile?.stripe_customer_id) continue;

      try {
        const subs = await stripe.subscriptions.list({ customer: profile.stripe_customer_id, status: "active", limit: 3 });
        const activeSub = subs.data.find((s) => !s.cancel_at_period_end) || subs.data[0];
        if (!activeSub) continue;

        const livePriceId = activeSub.items?.data?.[0]?.price?.id;
        if (!livePriceId) continue;

        const livePrice = await stripe.prices.retrieve(livePriceId);
        const liveTier = livePrice.metadata?.musicdibs_plan_id;
        const liveCredits = livePrice.metadata?.credits ? parseInt(livePrice.metadata.credits, 10) : null;
        if (!liveTier || liveCredits === null) continue;

        const dbTier = profile.subscription_tier;
        const dbCreditsFromPlan = Math.max(0, (profile.available_credits ?? 0) - (profile.permanent_credits ?? 0));

        if (dbTier !== liveTier) {
          const { data: { user } } = await supabase.auth.admin.getUserById(userId);
          issues.push({
            type: "cambio_plan_desincronizado", severity: "critical", email: user?.email || "unknown",
            detail: `Tras un "Cambio de plan", el tier en DB (${dbTier ?? "null"}) no coincide con el plan REAL activo en Stripe (${liveTier}, ${liveCredits} créditos). Créditos actuales en DB: ${profile.available_credits}.`,
          });
        } else if (dbCreditsFromPlan !== liveCredits) {
          const { data: { user } } = await supabase.auth.admin.getUserById(userId);
          issues.push({
            type: "creditos_plan_incorrectos_tras_cambio", severity: "warning", email: user?.email || "unknown",
            detail: `Tier correcto (${liveTier}) pero créditos de plan no coinciden: DB tiene ${dbCreditsFromPlan} (sin contar permanentes), Stripe/plan espera ${liveCredits}.`,
          });
        }
      } catch (e: any) {
        console.warn(`[PURCHASE-AUDIT] Error verificando cambio de plan para user ${userId}:`, e?.message);
      }
    }

    // ── 3. Cancelaciones/impagos: créditos de plan deben estar en 0 ──────────
    const { data: cancelledSubs } = await supabase
      .from("subscriptions")
      .select("user_id, status, updated_at")
      .gte("updated_at", since.toISOString())
      .in("status", ["cancelled", "past_due"]);

    for (const s of cancelledSubs || []) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("available_credits, permanent_credits, subscription_plan")
        .eq("user_id", s.user_id)
        .maybeSingle();
      if (!profile) continue;
      const planCredits = (profile.available_credits ?? 0) - (profile.permanent_credits ?? 0);
      if (s.status === "cancelled" && planCredits > 0) {
        const { data: { user } } = await supabase.auth.admin.getUserById(s.user_id);
        issues.push({
          type: "creditos_no_eliminados_cancelacion", severity: "warning", email: user?.email || "unknown",
          detail: `Suscripción cancelada pero quedan ${planCredits} créditos de plan sin resetear (permanentes: ${profile.permanent_credits ?? 0})`,
        });
      }
    }

    // ── 4. Evidencias IBS pendientes de crear (compras sin evidencia) ────────
    const { data: ordersNoEvidence } = await supabase
      .from("orders")
      .select("id, user_id, product_code, product_label, paid_at")
      .gte("paid_at", since.toISOString());

    for (const o of ordersNoEvidence || []) {
      const label = (o as any).product_label as string | null;
      if (label && NON_PURCHASE_LABEL_PREFIXES.some((p) => label.startsWith(p))) continue;

      const { data: evidence } = await supabase
        .from("purchase_evidences")
        .select("id")
        .eq("order_id", o.id)
        .maybeSingle();
      if (!evidence) {
        const { data: { user } } = await supabase.auth.admin.getUserById(o.user_id);
        issues.push({
          type: "orden_sin_evidencia_ibs", severity: "warning", email: user?.email || "unknown",
          detail: `Order ${o.id} (${o.product_code}) sin purchase_evidence asociada.`,
        });
      }
    }

    // ── 5. Downgrades programados (Subscription Schedules) ──────────────
    const { data: pendingDowngrades } = await supabase
      .from("subscriptions")
      .select("user_id, schedule_id, pending_plan_id, pending_credits, pending_effective_at, stripe_subscription_id")
      .not("schedule_id", "is", null);

    for (const sub of pendingDowngrades || []) {
      const { data: { user } } = await supabase.auth.admin.getUserById(sub.user_id);
      const email = user?.email || "unknown";
      const effectiveDate = sub.pending_effective_at ? new Date(sub.pending_effective_at) : null;
      const alreadyDue = effectiveDate ? effectiveDate.getTime() <= Date.now() : false;

      try {
        const schedule = await stripe.subscriptionSchedules.retrieve(sub.schedule_id!);

        const { data: profile } = await supabase
          .from("profiles")
          .select("subscription_tier, available_credits, permanent_credits")
          .eq("user_id", sub.user_id)
          .maybeSingle();
        const planCredits = profile ? Math.max(0, (profile.available_credits ?? 0) - (profile.permanent_credits ?? 0)) : null;

        if (!alreadyDue) {
          if (["canceled", "completed"].includes(schedule.status)) {
            issues.push({
              type: "downgrade_schedule_estado_inesperado", severity: "warning", email,
              detail: `Schedule ${sub.schedule_id} en estado '${schedule.status}' pero seguimos con un downgrade pendiente a ${sub.pending_plan_id} en DB (programado para ${sub.pending_effective_at}). Revisar si hay que limpiar los campos pending_* manualmente.`,
            });
          }
          if (profile && (profile.subscription_tier === sub.pending_plan_id || planCredits === sub.pending_credits)) {
            issues.push({
              type: "downgrade_aplico_creditos_antes_de_tiempo", severity: "critical", email,
              detail: `Downgrade a ${sub.pending_plan_id} programado para ${sub.pending_effective_at} (aun no ha llegado la fecha), pero el perfil YA refleja el tier/creditos del plan nuevo (tier=${profile.subscription_tier}, creditos_plan=${planCredits}). No deberia haberse tocado nada hasta la renovacion real -- revisar si algun proceso reseteo creditos antes de tiempo.`,
            });
          }
        } else {
          const activeSubId = typeof (schedule as any).subscription === "string" ? (schedule as any).subscription : sub.stripe_subscription_id;
          let liveTierOk = false;
          let liveDetail = "";
          try {
            const liveSub = activeSubId ? await stripe.subscriptions.retrieve(activeSubId) : null;
            const livePriceId = liveSub?.items?.data?.[0]?.price?.id;
            liveTierOk = livePriceId === sub.pending_price_id;
            liveDetail = `Stripe price actual: ${livePriceId ?? "desconocido"}, esperado: ${sub.pending_price_id}.`;
          } catch (e: any) {
            liveDetail = `No se pudo verificar la suscripcion en Stripe: ${e?.message}`;
          }

          const dbOk = !!profile && profile.subscription_tier === sub.pending_plan_id && planCredits === sub.pending_credits;

          if (!liveTierOk || !dbOk) {
            issues.push({
              type: "downgrade_no_aplicado_en_fecha", severity: "critical", email,
              detail: `El downgrade a ${sub.pending_plan_id} (programado para ${sub.pending_effective_at}) ya deberia haberse aplicado. ${liveDetail} En DB: tier=${profile?.subscription_tier ?? "?"}, creditos_plan=${planCredits ?? "?"} (esperado ${sub.pending_credits}). Revisar si el webhook de renovacion proceso el evento correctamente.`,
            });
          } else {
            await supabase.from("subscriptions").update({
              schedule_id: null, pending_price_id: null, pending_plan_id: null,
              pending_plan_label: null, pending_credits: null, pending_effective_at: null,
              updated_at: new Date().toISOString(),
            }).eq("user_id", sub.user_id);
            console.log(`[PURCHASE-AUDIT] Downgrade de ${email} verificado OK y campos pending_* limpiados.`);
          }
        }
      } catch (e: any) {
        issues.push({
          type: "downgrade_schedule_error_verificacion", severity: "warning", email,
          detail: `Error al verificar el schedule ${sub.schedule_id} en Stripe: ${e?.message}`,
        });
      }
    }

    // ── 6. Sincronizacion de estado de pago con Stripe ───────────────
    // FIX (2026-07-11, caso juancarlosjacomeg84@gmail.com y otros 11 similares):
    // el chequeo de "limpiar gracia tras recuperacion" exigia que
    // payment_grace_expires_at estuviera puesto para autorepararse. Pero varios
    // usuarios tienen payment_issue_notified_at / payment_issue_count activos
    // de ANTES de que ese campo de gracia existiera (eventos de mayo/junio),
    // asi que nunca entraban en esta comprobacion pese a tener la suscripcion
    // ya genuinamente al dia. Se amplia la condicion para disparar tambien
    // cuando payment_issue_notified_at este activo, con o sin grace_expires_at.
    const { data: paidProfiles } = await supabase
      .from("profiles")
      .select("user_id, subscription_plan, subscription_tier, stripe_customer_id, payment_grace_expires_at, payment_issue_count, payment_issue_notified_at")
      .in("subscription_plan", ["Monthly", "Annual"])
      .not("stripe_customer_id", "is", null);

    for (const profile of paidProfiles || []) {
      try {
        const subs = await stripe.subscriptions.list({ customer: profile.stripe_customer_id!, status: "all", limit: 5 });
        const relevantSub = subs.data.find((s) => ["active", "trialing", "past_due", "unpaid"].includes(s.status));
        if (!relevantSub) continue;

        const { data: dbSub } = await supabase
          .from("subscriptions")
          .select("status")
          .eq("user_id", profile.user_id)
          .maybeSingle();

        if (dbSub && dbSub.status !== relevantSub.status) {
          await supabase.from("subscriptions").update({
            status: relevantSub.status,
            updated_at: new Date().toISOString(),
          }).eq("user_id", profile.user_id);

          const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id);
          issues.push({
            type: "subscription_status_desincronizado", severity: "warning", email: user?.email || "unknown",
            detail: `subscriptions.status decia '${dbSub.status}' pero Stripe reporta '${relevantSub.status}'. Sincronizado automaticamente.`,
          });
        }

        if (["past_due", "unpaid"].includes(relevantSub.status) && !profile.payment_grace_expires_at) {
          const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id);
          issues.push({
            type: "impago_sin_seguimiento_gracia", severity: "critical", email: user?.email || "unknown",
            detail: `Suscripcion en '${relevantSub.status}' en Stripe, plan sigue en ${profile.subscription_plan}/${profile.subscription_tier}, pero SIN periodo de gracia activo (payment_grace_expires_at es null, payment_issue_count=${profile.payment_issue_count ?? 0}). Revisar si es una reactivacion indebida tras un intento de renovacion fallido, o si simplemente nunca se inicio el seguimiento pese al impago real.`,
          });
          await supabase.from("profiles").update({
            payment_issue_notified_at: new Date().toISOString(),
            payment_issue_count: (profile.payment_issue_count ?? 0) + 1,
            payment_grace_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("user_id", profile.user_id);
        }

        // FIX: dispara tambien si SOLO payment_issue_notified_at esta activo
        // (casos antiguos de mayo/junio sin grace_expires_at asociado).
        if (["active", "trialing"].includes(relevantSub.status) && (profile.payment_grace_expires_at || profile.payment_issue_notified_at)) {
          const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id);
          issues.push({
            type: "gracia_no_limpiada_tras_recuperacion", severity: "warning", email: user?.email || "unknown",
            detail: `Suscripcion ya '${relevantSub.status}' en Stripe (recuperada tras impago), pero quedaban campos de aviso de impago activos (grace_expires_at=${profile.payment_grace_expires_at ?? "null"}, notified_at=${profile.payment_issue_notified_at ?? "null"}, count=${profile.payment_issue_count ?? 0}). Limpiado automaticamente -- ya no deberia mostrarse la etiqueta de periodo de gracia en el front.`,
          });
          await supabase.from("profiles").update({
            payment_issue_notified_at: null,
            payment_issue_count: 0,
            payment_grace_expires_at: null,
            updated_at: new Date().toISOString(),
          }).eq("user_id", profile.user_id);
        }
      } catch (e: any) {
        console.warn(`[PURCHASE-AUDIT] Error verificando sincronizacion de pago para user ${profile.user_id}:`, e?.message);
      }
    }

    // ── Reporte ─────────────────────────────────────────────────
    const criticals = issues.filter(i => i.severity === "critical");
    const warnings = issues.filter(i => i.severity === "warning");
    const hasIssues = issues.length > 0;

    const toSummarize = issues.filter(i => SUMMARIZE_TYPES.has(i.type));
    const toList = issues.filter(i => !SUMMARIZE_TYPES.has(i.type));

    const summaryLines = Object.entries(
      toSummarize.reduce((acc: Record<string, number>, i) => {
        acc[i.type] = (acc[i.type] || 0) + 1;
        return acc;
      }, {})
    ).map(([type, count]) => `🟡 [${type}] ${count} casos corregidos automaticamente (detalle completo en logs de la funcion, no listado aqui para mantener el email legible).`);

    const rows = toList.map(i => {
      const icon = i.severity === "critical" ? "🔴" : "🟡";
      return `${icon} [${i.type}] ${i.email}\n${i.detail}${i.charge_id ? `\nCharge: ${i.charge_id}` : ""}\n`;
    }).concat(summaryLines).join("\n");

    const subject = hasIssues
      ? `${criticals.length > 0 ? "🚨" : "⚠️"} Auditoría compras MusicDibs — ${criticals.length} críticos, ${toList.length - criticals.length} avisos detallados, ${toSummarize.length} auto-corregidos`
      : "✅ Auditoría compras MusicDibs — Todo correcto (últimas 24h)";

    const html = `
📋 Auditoría de Integridad de Compras — MusicDibs
Ventana: últimas ${HOURS}h (desde ${since.toISOString()})

${hasIssues
  ? `Se detectaron ${issues.length} incidencias (${toList.length} detalladas abajo, ${toSummarize.length} auto-corregidas y resumidas):\n\n${rows}\n⚠️ Revisar manualmente y corregir con Claude / SQL directo. Este cron corrige automaticamente: campos pending_* de downgrades verificados, subscriptions.status desincronizado, inicializacion de seguimiento de gracia ausente, y limpieza de gracia/avisos de impago tras recuperacion confirmada. El resto requiere revision manual.`
  : "✅ Todas las compras, cambios de plan, downgrades programados, cancelaciones y estados de pago de las últimas 24h están correctamente procesados."
}

Chequeos realizados:
1. Cargos de Stripe succeeded vs orders en Supabase (busca por charge_id, payment_intent_id, invoice_id, subscription_id Y customer+importe+tiempo antes de reportar fallo)
2. Créditos asignados coherentes con el producto comprado
3. subscription_tier coherente con la última compra (excluye cancelaciones e importes en €0)
4. Upgrades de plan coherentes con la suscripción real y viva en Stripe (inmediatos, con prorrateo)
5. Downgrades PROGRAMADOS para fin de periodo: (a) que no se hayan aplicado creditos/tier antes de tiempo mientras estan pendientes, y (b) que Stripe y nuestra DB reflejen el plan nuevo una vez pasada la fecha programada
6. Créditos de plan reseteados en cancelaciones definitivas
7. Evidencias IBS creadas para cada order de compra real (excluye registros de cancelación)
8. Sincronizacion de subscriptions.status con Stripe + inicializacion/limpieza de seguimiento de periodo de gracia y avisos de impago (auto-corrige en ambas direcciones, incluyendo casos antiguos sin grace_expires_at asociado; alerta si sugiere reactivacion indebida). Los avisos de status desincronizado se muestran resumidos por conteo, no uno por uno.

MusicDibs Monitoring · Auditoría diaria 07:00 UTC
`;

    await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        idempotency_key: `purchase-audit-${new Date().toISOString().slice(0, 10)}`,
        message_id: crypto.randomUUID(),
        to: "info@musicdibs.com",
        from: "MusicDibs <noreply@notify.musicdibs.com>",
        sender_domain: "notify.musicdibs.com",
        subject, html,
        purpose: "transactional", label: "purchase_integrity_audit",
        queued_at: new Date().toISOString(),
      },
    });

    console.log(`[PURCHASE-AUDIT] ${subject}`);
    return json({ ok: true, issues_count: issues.length, criticals: criticals.length, warnings: warnings.length, issues });

  } catch (e: any) {
    console.error("[PURCHASE-AUDIT] Fatal:", e);
    return json({ error: e?.message || "Internal error" }, 500);
  }
});
