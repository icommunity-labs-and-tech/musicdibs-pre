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
 * Cruza cada perfil con plan de pago activo contra el estado REAL y en vivo
 * de su suscripción en Stripe. Si Stripe confirma que la suscripción ya no
 * está activa (cancelada / incompleta / sin ninguna suscripción), y la
 * "vigencia" restante no corresponde a una invoice realmente pagada,
 * corrige activamente: plan/tier -> Free, créditos de plan -> 0
 * (créditos permanentes de topups intactos).
 *
 * A diferencia de purchase-integrity-monitor (solo lectura), este cron SÍ
 * corrige — el propio negocio pidió corrección activa para este caso
 * concreto: "cuando se cancela... y la fecha ya no esta vigente, debemos
 * cancelarla (pasar a Free) y resetear a 0 los creditos de plan".
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
  const errors: { email: string; error: string }[] = [];

  try {
    // Todos los perfiles con plan de pago activo Y stripe_customer_id
    // FIX: con 500+ suscriptores activos, comprobar TODOS contra Stripe cada día
    // agota el timeout de la function. Prefiltro barato en DB: solo revisamos
    // los que llevan más tiempo sin actualizarse del esperado por su ciclo de
    // facturación (mensual >35 días, anual >370 días) — la inmensa mayoría se
    // renueva correctamente vía webhook y no necesita ni tocar la API de Stripe.
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

    // FIX CRÍTICO (2026-07-04): el filtro anterior consideraba "candidato" a
    // CUALQUIERA con subscription_plan activo, sin exigir evidencia de que esa
    // persona alguna vez tuvo una suscripción de Stripe REAL. Esto disparó 30
    // falsos positivos en la primera prueba: usuarios cuyo saldo venia de
    // migración WordPress o de una concesión manual de soporte (admin_grant),
    // cuyo campo subscription_plan se puso en Monthly/Annual sin que existiera
    // NUNCA una suscripción de Stripe detrás. Ahora exigimos explícitamente
    // un stripe_subscription_id real registrado en nuestra tabla subscriptions
    // — sin eso, no hay "webhook perdido" que reconciliar, es otro problema
    // (migración/ajuste manual) que este cron NO debe tocar.
    const staleCandidates = (candidateProfiles || []).filter((p) => {
      const subRow = subsRowByUser.get(p.user_id);
      if (!subRow?.stripe_subscription_id) return false; // sin evidencia de sub real -> no tocar
      const cutoff = p.subscription_plan === "Annual" ? staleAnnualCutoff : staleMonthlyCutoff;
      return subRow.updated_at < cutoff;
    });

    console.log(`[RECONCILIATION] ${candidateProfiles?.length ?? 0} perfiles con plan activo, ${staleCandidates.length} candidatos con suscripción Stripe real y "stale" a verificar`);

    for (const profile of staleCandidates) {
      try {
        // Suscripciones activas o en trial en Stripe (fuente de verdad en vivo)
        const subs = await stripe.subscriptions.list({
          customer: profile.stripe_customer_id!,
          status: "all",
          limit: 5,
        });

        // Si Stripe no devuelve NINGUNA suscripción (ni siquiera cancelada),
        // algo no cuadra con nuestro registro de un stripe_subscription_id real
        // -- no corregimos por precaución, solo alertamos para revisión manual.
        if (subs.data.length === 0) {
          const { data: { user: emptyUser } } = await supabase.auth.admin.getUserById(profile.user_id);
          errors.push({ email: emptyUser?.email || profile.user_id, error: `subscriptions.list vacío pese a tener stripe_subscription_id registrado — revisar manualmente` });
          continue;
        }

        // ¿Alguna suscripción está genuinamente activa (con acceso pagado real)?
        const genuinelyActive = subs.data.find((s) => {
          if (!["active", "trialing", "past_due"].includes(s.status)) return false;
          return true;
        });

        if (genuinelyActive) continue; // todo correcto, nada que corregir

        // FIX: además, si el saldo actual de créditos "de plan" (available -
        // permanent) proviene ÚNICAMENTE de transacciones type IN
        // ('migration','admin_grant') sin ningún 'purchase'/'subscription' de
        // por medio, no lo tocamos — no es un caso de webhook perdido.
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

        // Ninguna suscripción activa en Stripe. Verificar que no sea un falso
        // positivo por "vigencia" de un periodo cuya invoice nunca se pagó
        // (el bug exacto que motivó este cron): comprobar la ÚLTIMA invoice
        // conocida de la suscripción más reciente.
        const mostRecentSub = subs.data.sort((a, b) => b.created - a.created)[0];
        if (mostRecentSub?.latest_invoice) {
          const invoiceId = typeof mostRecentSub.latest_invoice === "string"
            ? mostRecentSub.latest_invoice
            : mostRecentSub.latest_invoice.id;
          try {
            const invoice = await stripe.invoices.retrieve(invoiceId);
            // Si la última invoice SÍ está pagada y su periodo cubre el momento
            // actual, no corregimos (acceso legítimamente vigente).
            if (invoice.status === "paid") {
              const periodEnd = invoice.lines?.data?.[0]?.period?.end;
              if (periodEnd && periodEnd * 1000 > Date.now()) continue;
            }
          } catch { /* si falla la consulta, seguimos con la corrección por precaución */ }
        }

        // Confirmado: sin suscripción activa real en Stripe. Corregir.
        const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id);
        const email = user?.email || "unknown";
        const planCredits = Math.max(0, (profile.available_credits ?? 0) - (profile.permanent_credits ?? 0));

        await supabase.from("profiles").update({
          subscription_plan: "Free",
          subscription_tier: null,
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

    // ── Email de resumen ────────────────────────────────────────────────────
    const hasActivity = corrections.length > 0 || errors.length > 0;
    if (hasActivity) {
      const rows = corrections.map(c => `✅ ${c.email}: ${c.before} → ${c.after} (${c.reason})`).join("\n");
      const errRows = errors.map(e => `⚠️ ${e.email}: ${e.error}`).join("\n");
      const html = `
🔄 Reconciliación de Suscripciones — MusicDibs

Se revisaron ${candidateProfiles?.length ?? 0} perfiles con plan de pago activo. De ellos, ${staleCandidates.length} llevaban más tiempo sin actualizarse del esperado por su ciclo de facturación y se verificaron en vivo contra Stripe.

${corrections.length > 0 ? `Correcciones aplicadas (${corrections.length}):\n\n${rows}\n` : ""}
${errors.length > 0 ? `\nErrores al procesar (${errors.length}):\n\n${errRows}\n` : ""}

Este cron SÍ modifica datos automáticamente (a diferencia del monitor de compras, que es solo lectura) — es la red de seguridad para cuando un webhook de cancelación de Stripe no llega a procesarse.

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
          subject: `🔄 Reconciliación de suscripciones — ${corrections.length} corregidas${errors.length ? `, ${errors.length} errores` : ""}`,
          html, purpose: "transactional", label: "subscription_reconciliation",
          queued_at: new Date().toISOString(),
        },
      });
    }

    return json({ ok: true, total_active: candidateProfiles?.length ?? 0, checked_stale: staleCandidates.length, corrections: corrections.length, errors: errors.length, details: corrections });
  } catch (e: any) {
    console.error("[RECONCILIATION] Fatal:", e);
    return json({ error: e?.message || "Internal error" }, 500);
  }
});
