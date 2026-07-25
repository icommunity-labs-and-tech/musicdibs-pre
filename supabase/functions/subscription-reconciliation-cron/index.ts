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

/**
 * subscription-reconciliation-cron
 *
 * Red de seguridad contra fallos de entrega de webhooks de Stripe.
 *
 * PASADA 1 (histórica): perfiles con plan activo y una fila en `subscriptions`
 * que ya no refleja el estado real (Stripe la dio de baja pero seguimos
 * mostrando "active" localmente). Corrige activamente: plan/tier -> Free.
 *
 * PASADA 2 (nueva, 2026-07-14): perfiles con plan activo y stripe_customer_id
 * pero SIN NINGUNA fila en `subscriptions` en absoluto — el caso opuesto,
 * causado por un webhook de creación que nunca persistió la fila (detectado
 * en auditoría: 14 casos acumulados en ~4 semanas, todos con suscripción
 * genuinamente activa en Stripe). Si Stripe confirma una suscripción activa,
 * se INSERTA la fila que falta. Si Stripe no confirma nada, solo se alerta
 * para revisión manual — nunca se toca `profiles` en este caso (podría ser
 * legítimamente Free y el plan del perfil estar mal, no al revés).
 */
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

  const corrections: { email: string; before: string; after: string; reason: string }[] = [];
  const insertions: { email: string; stripe_subscription_id: string; plan: string }[] = [];
  const errors: { email: string; error: string }[] = [];

  try {
    // ── PASADA 1: local dice "active" pero Stripe ya no lo confirma ───────────
    const staleMonthlyCutoff = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
    const staleAnnualCutoff = new Date(Date.now() - 370 * 24 * 60 * 60 * 1000).toISOString();

    const { data: candidateProfiles } = await supabase
      .from("profiles")
      .select("user_id, subscription_plan, subscription_tier, stripe_customer_id, available_credits, permanent_credits")
      .in("subscription_plan", ["Monthly", "Annual"])
      .not("stripe_customer_id", "is", null);

    const userIds = (candidateProfiles || []).map((p) => p.user_id);
    const { data: subsRows } = userIds.length > 0
      ? await supabase.from("subscriptions").select("user_id, updated_at, stripe_subscription_id").in("user_id", userIds)
      : { data: [] };
    const subsRowByUser = new Map((subsRows || []).map((s) => [s.user_id, s]));

    const staleCandidates = (candidateProfiles || []).filter((p) => {
      const subRow = subsRowByUser.get(p.user_id);
      if (!subRow?.stripe_subscription_id) return false; // sin evidencia de sub real -> lo cubre la Pasada 2
      const cutoff = p.subscription_plan === "Annual" ? staleAnnualCutoff : staleMonthlyCutoff;
      return subRow.updated_at < cutoff;
    });

    console.log(`[RECONCILIATION] Pasada 1: ${candidateProfiles?.length ?? 0} perfiles con plan activo, ${staleCandidates.length} candidatos stale a verificar`);

    for (const profile of staleCandidates) {
      try {
        const subs = await stripe.subscriptions.list({
          customer: profile.stripe_customer_id!,
          status: "all",
          limit: 5,
        });

        if (subs.data.length === 0) {
          const { data: { user: emptyUser } } = await supabase.auth.admin.getUserById(profile.user_id);
          errors.push({ email: emptyUser?.email || profile.user_id, error: `subscriptions.list vacío pese a tener stripe_subscription_id registrado — revisar manualmente` });
          continue;
        }

        const genuinelyActive = subs.data.find((s) => ["active", "trialing", "past_due"].includes(s.status));
        if (genuinelyActive) continue;

        const { data: creditHistory } = await supabase
          .from("credit_transactions")
          .select("type, amount")
          .eq("user_id", profile.user_id)
          .gt("amount", 0);
        const hasGenuinePurchase = (creditHistory || []).some((t) => ["purchase", "subscription"].includes(t.type));
        if (!hasGenuinePurchase) {
          console.log(`[RECONCILIATION] Saltando ${profile.user_id}: sin ninguna transacción purchase/subscription real, solo migración/concesión manual`);
          continue;
        }

        const mostRecentSub = subs.data.sort((a, b) => b.created - a.created)[0];
        if (mostRecentSub?.latest_invoice) {
          const invoiceId = typeof mostRecentSub.latest_invoice === "string"
            ? mostRecentSub.latest_invoice
            : mostRecentSub.latest_invoice.id;
          try {
            const invoice = await stripe.invoices.retrieve(invoiceId);
            if (invoice.status === "paid") {
              const periodEnd = invoice.lines?.data?.[0]?.period?.end;
              if (periodEnd && periodEnd * 1000 > Date.now()) continue;
            }
          } catch { /* si falla la consulta, seguimos con la corrección por precaución */ }
        }

        const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id);
        const email = user?.email || "unknown";
        const planCredits = Math.max(0, (profile.available_credits ?? 0) - (profile.permanent_credits ?? 0));

        await supabase.from("profiles").update({
          subscription_plan: "Free",
          subscription_tier: "free",
          available_credits: profile.permanent_credits ?? 0,
          updated_at: new Date().toISOString(),
        }).eq("user_id", profile.user_id);

        if (planCredits > 0) {
          await supabase.from("credit_transactions").insert({
            user_id: profile.user_id, amount: -planCredits, type: "admin_reset",
            description: `Reconciliación automática: suscripción sin acceso activo real en Stripe (webhook probablemente no procesado). Plan reseteado a Free, -${planCredits} créditos de plan.`,
          });
        }

        await supabase.from("subscriptions").update({
          status: "cancelled", updated_at: new Date().toISOString(),
        }).eq("user_id", profile.user_id);

        await supabase.from("admin_alerts").insert({
          source: "subscription-reconciliation-cron", severity: "warn",
          message: `Suscripción reconciliada: ${email} tenía plan ${profile.subscription_plan} activo en DB sin suscripción activa real en Stripe. Corregido a Free.`,
          context: { user_id: profile.user_id, email, previous_plan: profile.subscription_plan, plan_credits_removed: planCredits, stripe_customer_id: profile.stripe_customer_id },
          resolved: false,
        });

        corrections.push({ email, before: profile.subscription_plan!, after: "Free", reason: "sin suscripción activa real en Stripe" });
        console.log(`[RECONCILIATION] ${email}: ${profile.subscription_plan} -> Free (${planCredits} créditos removidos)`);
      } catch (e: any) {
        const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id);
        errors.push({ email: user?.email || profile.user_id, error: e?.message || "unknown error" });
        console.error(`[RECONCILIATION] Error procesando ${profile.user_id}:`, e?.message);
      }
    }

    // ── PASADA 2 (nueva): plan activo + stripe_customer_id, sin fila en subscriptions ──
    const { data: missingRowCandidates, error: missingRowErr } = await supabase.rpc("detect_profiles_missing_subscription_row");
    if (missingRowErr) throw missingRowErr;

    console.log(`[RECONCILIATION] Pasada 2: ${missingRowCandidates?.length ?? 0} perfiles con plan activo sin ninguna fila en subscriptions`);

    for (const candidate of (missingRowCandidates || [])) {
      const email = candidate.email || candidate.user_id;
      try {
        const subs = await stripe.subscriptions.list({
          customer: candidate.stripe_customer_id,
          status: "all",
          limit: 5,
        });

        const genuinelyActive = subs.data
          .filter((s) => ["active", "trialing", "past_due"].includes(s.status))
          .sort((a, b) => b.created - a.created)[0];

        if (!genuinelyActive) {
          // Stripe no confirma nada activo -> no tocamos profiles, solo alertamos.
          await supabase.from("admin_alerts").insert({
            source: "subscription-reconciliation-cron", severity: "warn",
            message: `${email} tiene plan ${candidate.subscription_plan} activo en profiles y stripe_customer_id, pero SIN fila en subscriptions y SIN suscripción activa confirmada en Stripe. Revisar manualmente (posible plan mal asignado).`,
            context: { user_id: candidate.user_id, email, subscription_plan: candidate.subscription_plan, stripe_customer_id: candidate.stripe_customer_id },
            resolved: false,
          });
          errors.push({ email, error: "sin fila en subscriptions y sin suscripción activa confirmada en Stripe — alertado para revisión manual" });
          continue;
        }

        const item = genuinelyActive.items.data[0];
        const price = item?.price;
        const planLabel = candidate.subscription_plan; // 'Monthly' | 'Annual'
        const tier = price?.metadata?.musicdibs_plan_id || (planLabel === "Annual" ? "annual_100" : "monthly");
        const amount = price?.unit_amount != null ? price.unit_amount / 100 : null;

        const { error: insertErr } = await supabase.from("subscriptions").insert({
          user_id: candidate.user_id,
          stripe_customer_id: candidate.stripe_customer_id,
          stripe_subscription_id: genuinelyActive.id,
          stripe_price_id: price?.id || null,
          plan: planLabel,
          tier,
          plan_type: "recurring",
          status: genuinelyActive.status,
          amount,
          currency: genuinelyActive.currency,
          current_period_start: new Date(item.current_period_start * 1000).toISOString(),
          current_period_end: new Date(item.current_period_end * 1000).toISOString(),
          cancel_at_period_end: genuinelyActive.cancel_at_period_end,
          canceled_at: genuinelyActive.canceled_at ? new Date(genuinelyActive.canceled_at * 1000).toISOString() : null,
        });
        if (insertErr) throw insertErr;

        await supabase.from("admin_alerts").insert({
          source: "subscription-reconciliation-cron", severity: "info",
          message: `Fila de suscripción faltante restaurada automáticamente para ${email} (webhook de creación probablemente no procesado). Suscripción Stripe ${genuinelyActive.id} confirmada activa.`,
          context: { user_id: candidate.user_id, email, stripe_subscription_id: genuinelyActive.id, plan: planLabel },
          resolved: true,
        });

        insertions.push({ email, stripe_subscription_id: genuinelyActive.id, plan: planLabel });
        console.log(`[RECONCILIATION] Fila restaurada para ${email} (${genuinelyActive.id})`);
      } catch (e: any) {
        errors.push({ email, error: e?.message || "unknown error" });
        console.error(`[RECONCILIATION] Error en Pasada 2 procesando ${candidate.user_id}:`, e?.message);
      }
    }

    // ── Email de resumen ───────────────────────────────────────────────────────
    const hasActivity = corrections.length > 0 || insertions.length > 0 || errors.length > 0;
    if (hasActivity) {
      const rows = corrections.map(c => `✅ ${c.email}: ${c.before} → ${c.after} (${c.reason})`).join("\n");
      const insertRows = insertions.map(i => `🆕 ${i.email}: fila de suscripción restaurada (${i.plan}, ${i.stripe_subscription_id})`).join("\n");
      const errRows = errors.map(e => `⚠️ ${e.email}: ${e.error}`).join("\n");
      const html = `
🔄 Reconciliación de Suscripciones — MusicDibs

Pasada 1 (local activo, Stripe no lo confirma): ${candidateProfiles?.length ?? 0} perfiles revisados, ${staleCandidates.length} candidatos "stale" verificados en vivo.
Pasada 2 (sin fila local, plan activo en profiles): ${missingRowCandidates?.length ?? 0} candidatos verificados en vivo.

${corrections.length > 0 ? `Correcciones a Free (${corrections.length}):\n\n${rows}\n` : ""}
${insertions.length > 0 ? `\nFilas de suscripción restauradas (${insertions.length}):\n\n${insertRows}\n` : ""}
${errors.length > 0 ? `\nErrores / alertas para revisión manual (${errors.length}):\n\n${errRows}\n` : ""}

Este cron SÍ modifica datos automáticamente — es la red de seguridad para cuando un webhook de Stripe (creación o cancelación) no llega a procesarse.

MusicDibs Monitoring · Reconciliación diaria
`;
      await supabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          idempotency_key: `subscription-reconciliation-${new Date().toISOString().slice(0, 10)}`,
          message_id: crypto.randomUUID(),
          to: "info@musicdibs.com",
          from: "MusicDibs <noreply@notify.musicdibs.com>",
          sender_domain: "notify.musicdibs.com",
          subject: `🔄 Reconciliación de suscripciones — ${corrections.length} a Free, ${insertions.length} restauradas${errors.length ? `, ${errors.length} alertas` : ""}`,
          html, purpose: "transactional", label: "subscription_reconciliation",
          queued_at: new Date().toISOString(),
        },
      });
    }

    return json({
      ok: true,
      pass1_total_active: candidateProfiles?.length ?? 0,
      pass1_checked_stale: staleCandidates.length,
      pass1_corrections: corrections.length,
      pass2_missing_row_candidates: missingRowCandidates?.length ?? 0,
      pass2_insertions: insertions.length,
      errors: errors.length,
      corrections, insertions, error_details: errors,
    });
  } catch (e: any) {
    console.error("[RECONCILIATION] Fatal:", e);
    return json({ error: e?.message || "Internal error" }, 500);
  }
});
