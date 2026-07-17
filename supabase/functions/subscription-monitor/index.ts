import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// Tipos de transacción que justifican créditos elevados en cualquier plan
// FIX (2026-07-13): se anade "admin_grant" -- faltaba en la lista y generaba
// falsos positivos semanales para cuentas de partners/creadores de contenido
// con grants administrativos legitimos (casos: infoferaslanz, sergio/serchas
// @producetumusica.com, natalixrueda -- todos con admin_grant explicito).
const JUSTIFIED_TX_TYPES = ["migration", "admin_adjustment", "admin_reset", "admin_grant", "adjustment", "prize", "topup", "renewal"];
// Créditos máximos por tier (para cálculo de exceso)
const TIER_MAX: Record<string, number> = {
  free: 0, monthly: 8, annual_20: 20, annual_100: 100, annual_200: 200,
  annual_300: 300, annual_500: 500, annual_1000: 1000,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const authHeader = req.headers.get("Authorization") || "";
  const cronHeader = req.headers.get("x-cron-secret") || "";
  const isAuth = authHeader === `Bearer ${serviceKey}` || (cronSecret && cronHeader === cronSecret);
  if (!isAuth) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  const anomalies: { type: string; severity: string; count: number; description: string; examples?: string[] }[] = [];

  try {

    // ── 1. Plan activo sin suscripción activa ─────────────────────────────────────
    // FIX: antes se traían cientos de user_id a JS y se filtraban con .in("user_id", userIds),
    // lo que se trunca/falla silenciosamente a esa escala (bug detectado en auditoría, 554 falsos positivos).
    // Ahora se resuelve con NOT EXISTS directo en SQL vía RPC.
    const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: noSub, error: noSubErr } = await supabase.rpc("detect_active_plan_without_subscription", {
      cutoff_48h: cutoff48h,
    });
    if (noSubErr) throw noSubErr;
    if (noSub && noSub.length > 0) {
      const examples = noSub.slice(0, 5).map((p: any) => p.email || p.user_id);
      anomalies.push({
        type: "plan_activo_sin_suscripcion", severity: "warning", count: noSub.length,
        description: `${noSub.length} usuarios con plan Annual/Monthly sin suscripción activa (excluidos: migrados WP, altas <48h, cuentas internas).`,
        examples,
      });
    }

    // ── 2. Suscripciones vencidas >30 días que siguen "active" ──────────────────────────
    const { data: expiredActive } = await supabase.from("subscriptions").select("user_id")
      .eq("status", "active")
      .lt("current_period_end", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .not("current_period_end", "is", null);
    if (expiredActive && expiredActive.length > 0) {
      anomalies.push({
        type: "suscripciones_vencidas_activas", severity: "critical", count: expiredActive.length,
        description: `${expiredActive.length} suscripciones llevan >30 días vencidas pero siguen "active". Posible fallo del cron de renovaciones.`,
      });
    }

    // ── 3. Free con créditos altos sin justificación ───────────────────────────
    // FIX: mismo patrón de .in("user_id", userIds) sustituido por RPC con NOT EXISTS.
    const FREE_CREDIT_THRESHOLD = 100;
    const { data: suspicious, error: suspiciousErr } = await supabase.rpc("detect_free_high_credits", {
      threshold: FREE_CREDIT_THRESHOLD,
      justified_types: JUSTIFIED_TX_TYPES,
    });
    if (suspiciousErr) throw suspiciousErr;
    if (suspicious && suspicious.length > 0) {
      anomalies.push({
        type: "free_con_creditos_altos", severity: "warning", count: suspicious.length,
        description: `${suspicious.length} usuarios Free tienen >${FREE_CREDIT_THRESHOLD} créditos no explicados por permanentes, migración ni ajuste admin.`,
      });
    }

    // ── 4. past_due >14 días sin resolver ────────────────────────────────
    const { data: stalePastDue } = await supabase.from("subscriptions").select("user_id")
      .eq("status", "past_due")
      .lt("updated_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());
    if (stalePastDue && stalePastDue.length > 0) {
      anomalies.push({
        type: "past_due_sin_resolver", severity: "warning", count: stalePastDue.length,
        description: `${stalePastDue.length} suscripciones llevan >14 días en past_due. Stripe probablemente ya las canceló.`,
      });
    }

    // ── 5. Créditos negativos ─────────────────────────────────────────────
    const { data: negCred } = await supabase.from("profiles").select("user_id").lt("available_credits", 0);
    if (negCred && negCred.length > 0) {
      anomalies.push({
        type: "creditos_negativos", severity: "critical", count: negCred.length,
        description: `${negCred.length} usuarios con créditos NEGATIVOS. Revisar urgentemente.`,
      });
    }

    // ── 6. Créditos excesivos en usuarios con plan activo ────────────────────────
    // FIX: candidatos (ya excluyendo migrados/internos) resueltos vía RPC con NOT EXISTS.
    // El umbral tier_max*multiplier se aplica en JS porque depende de una constante local, no de datos.
    const EXCESS_MULTIPLIER = 3;
    const { data: highCreditCandidates, error: highCreditErr } = await supabase.rpc("detect_high_credit_candidates");
    if (highCreditErr) throw highCreditErr;
    if (highCreditCandidates && highCreditCandidates.length > 0) {
      const realExcess = highCreditCandidates.filter((p: any) => {
        const tierMax = TIER_MAX[p.subscription_tier] || 0;
        if (tierMax === 0) return false;
        const creditsAbovePermanent = p.available_credits - (p.permanent_credits || 0);
        return creditsAbovePermanent > tierMax * EXCESS_MULTIPLIER;
      });
      if (realExcess.length > 0) {
        anomalies.push({
          type: "creditos_excesivos", severity: "warning", count: realExcess.length,
          description: `${realExcess.length} usuarios con créditos >${EXCESS_MULTIPLIER}x su tier (excluidos migrados WP, permanentes y cuentas internas). Posible doble-crédito real.`,
        });
      }
    }

    // ── 7. Evidencias pendientes de certificar >7 días ────────────────────────
    const { data: pendingEvidence } = await supabase.from("purchase_evidences").select("id")
      .eq("certification_status", "pending")
      .lt("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    if (pendingEvidence && pendingEvidence.length > 0) {
      anomalies.push({
        type: "evidencias_sin_certificar", severity: "warning", count: pendingEvidence.length,
        description: `${pendingEvidence.length} evidencias de compra llevan >7 días sin certificar en IBS.`,
      });
    }

    // ── Stats semanales ───────────────────────────────────────────────────────────────────
    const { count: activeCount } = await supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active");
    const { count: weekOrdersCount } = await supabase.from("orders").select("*", { count: "exact", head: true })
      .gte("paid_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    const { count: weekUsersCount } = await supabase.from("profiles").select("*", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    // ── Email ───────────────────────────────────────────────────────────────────────────
    const criticals = anomalies.filter(a => a.severity === "critical");
    const warnings = anomalies.filter(a => a.severity === "warning");
    const hasAnomalies = anomalies.length > 0;

    const anomalyRows = anomalies.map(a => {
      const icon = a.severity === "critical" ? "🔴" : "🟡";
      const examplesStr = a.examples && a.examples.length > 0 ? `\nEjemplos: ${a.examples.join(", ")}` : "";
      return `${icon} ${a.type.replace(/_/g, " ").toUpperCase()} — ${a.count} casos\n${a.description}${examplesStr}\n`;
    }).join("\n");

    const subject = hasAnomalies
      ? `${criticals.length > 0 ? "🚨" : "⚠️"} Monitoring MusicDibs — ${criticals.length} criticos, ${warnings.length} avisos`
      : "✅ Monitoring MusicDibs — Todo OK";

    const html = `
📊 Monitoring Semanal — MusicDibs

${new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

📈 Resumen de la semana
Suscriptores activos: ${activeCount ?? 0}
Pedidos últimos 7 días: ${weekOrdersCount ?? 0}
Nuevos usuarios (7 días): ${weekUsersCount ?? 0}

${hasAnomalies
  ? `⚠️ Anomalias detectadas (${anomalies.length})\n\n${anomalyRows}\n⚠️ Solo lectura — ningún dato fue modificado automáticamente.`
  : "✅ No se detectaron anomalias. Todo funciona correctamente."
}

MusicDibs Monitoring · Panel Admin
`;

    await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        idempotency_key: `monitoring-weekly-${new Date().toISOString().slice(0, 10)}`,
        message_id: crypto.randomUUID(),
        to: "info@musicdibs.com",
        from: "MusicDibs <noreply@notify.musicdibs.com>",
        sender_domain: "notify.musicdibs.com",
        subject,
        html,
        purpose: "transactional",
        label: "monitoring_weekly",
        queued_at: new Date().toISOString(),
      },
    });

    console.log(`[MONITORING] ${subject}`);
    return json({ ok: true, anomalies_count: anomalies.length, criticals: criticals.length, warnings: warnings.length, anomalies });

  } catch (e: any) {
    console.error("[MONITORING] Fatal:", e);
    return json({ error: e?.message || "Internal error" }, 500);
  }
});
