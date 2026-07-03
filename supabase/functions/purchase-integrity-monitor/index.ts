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

// Mapa de créditos esperados por producto (debe reflejar EXPLICIT_PRICE_IDS del webhook)
const EXPECTED_CREDITS: Record<string, number> = {
  annual_100: 100, annual_200: 200, annual_300: 300, annual_500: 500, annual_1000: 1000,
  monthly: 8, individual: 1, single: 1,
  topup_10: 10, topup_25: 25, topup_50: 50, topup_100: 100, topup_200: 200,
};
const SUBSCRIPTION_PRODUCT_TYPES = ["annual", "monthly"];

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

  const HOURS = 12;
  const since = new Date(Date.now() - HOURS * 60 * 60 * 1000);
  const issues: { type: string; severity: "critical" | "warning"; email: string; detail: string; charge_id?: string }[] = [];

  try {
    // ── 1. CROSS-CHECK Stripe charges succeeded vs orders en Supabase ──────────
    // Trae todos los charges succeeded de Stripe en la ventana, y verifica que
    // cada uno tenga un order correspondiente con créditos coherentes.
    const charges = await stripe.charges.list({
      created: { gte: Math.floor(since.getTime() / 1000) },
      limit: 100,
    });
    const succeededCharges = charges.data.filter(c => c.status === "succeeded" && c.amount > 0);

    for (const charge of succeededCharges) {
      const customerId = typeof charge.customer === "string" ? charge.customer : charge.customer?.id;
      if (!customerId) continue;

      // Buscar el order correspondiente por charge_id (o invoice si viene de suscripción)
      const { data: order } = await supabase
        .from("orders")
        .select("id, product_code, product_type, amount_gross, user_id")
        .or(`stripe_charge_id.eq.${charge.id}`)
        .maybeSingle();

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

      if (!order) {
        // Verificar si es un cargo de renovación automática (invoice) — buscar por invoice
        const invoiceId = typeof (charge as any).invoice === "string" ? (charge as any).invoice : (charge as any).invoice?.id;
        let hasInvoiceOrder = false;
        if (invoiceId) {
          const { data: invOrder } = await supabase.from("orders").select("id").eq("stripe_invoice_id", invoiceId).maybeSingle();
          hasInvoiceOrder = !!invOrder;
        }
        if (!hasInvoiceOrder) {
          issues.push({
            type: "charge_sin_order", severity: "critical", email,
            detail: `Cargo Stripe ${charge.id} (€${(charge.amount / 100).toFixed(2)}) succeeded sin order en Supabase. El webhook probablemente falló silenciosamente.`,
            charge_id: charge.id,
          });
        }
        continue;
      }

      // Verificar que el order tenga créditos asignados coherentes con el producto
      if (order.product_code && EXPECTED_CREDITS[order.product_code] !== undefined) {
        const expectedCredits = EXPECTED_CREDITS[order.product_code];
        // Ventana amplia: desde el cargo hasta ahora (cubre asignación automática
        // Y correcciones manuales posteriores, que pueden tardar horas en aplicarse)
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

    // ── 2. Verificar plan/tier coherente con la ultima compra ──────────────────
    const { data: recentOrders } = await supabase
      .from("orders")
      .select("user_id, product_code, product_type, is_subscription, paid_at")
      .gte("paid_at", since.toISOString())
      .eq("is_subscription", true)
      .eq("is_renewal", false);

    for (const o of recentOrders || []) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_plan, subscription_tier")
        .eq("user_id", o.user_id)
        .maybeSingle();
      if (!profile) continue;
      if (o.product_code && profile.subscription_tier !== o.product_code) {
        const { data: { user } } = await supabase.auth.admin.getUserById(o.user_id);
        issues.push({
          type: "tier_desincronizado", severity: "warning", email: user?.email || "unknown",
          detail: `Compró ${o.product_code} pero profile.subscription_tier = ${profile.subscription_tier}`,
        });
      }
    }

    // ── 3. Cancelaciones/impagos: créditos de plan deben estar en 0 ────────────
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

    // ── 4. Evidencias IBS pendientes de crear (compras sin evidencia) ──────────
    const { data: ordersNoEvidence } = await supabase
      .from("orders")
      .select("id, user_id, product_code, paid_at")
      .gte("paid_at", since.toISOString());

    for (const o of ordersNoEvidence || []) {
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

    // ── Reporte ──────────────────────────────────────────────────────────────
    const criticals = issues.filter(i => i.severity === "critical");
    const warnings = issues.filter(i => i.severity === "warning");
    const hasIssues = issues.length > 0;

    const rows = issues.map(i => {
      const icon = i.severity === "critical" ? "🔴" : "🟡";
      return `${icon} [${i.type}] ${i.email}\n${i.detail}${i.charge_id ? `\nCharge: ${i.charge_id}` : ""}\n`;
    }).join("\n");

    const subject = hasIssues
      ? `${criticals.length > 0 ? "🚨" : "⚠️"} Auditoría compras MusicDibs — ${criticals.length} críticos, ${warnings.length} avisos`
      : "✅ Auditoría compras MusicDibs — Todo correcto (últimas 12h)";

    const html = `
📋 Auditoría de Integridad de Compras — MusicDibs
Ventana: últimas ${HOURS}h (desde ${since.toISOString()})

${hasIssues
  ? `Se detectaron ${issues.length} incidencias:\n\n${rows}\n⚠️ Revisar manualmente y corregir con Claude / SQL directo. Este cron es SOLO LECTURA.`
  : "✅ Todas las compras, cambios de plan y cancelaciones de las últimas 12h están correctamente procesados."
}

Chequeos realizados:
1. Cargos de Stripe succeeded vs orders en Supabase (detecta webhook fallando silenciosamente)
2. Créditos asignados coherentes con el producto comprado
3. subscription_tier coherente con la última compra
4. Créditos de plan reseteados en cancelaciones definitivas
5. Evidencias IBS creadas para cada order

MusicDibs Monitoring · Auditoría diaria 09:00
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
