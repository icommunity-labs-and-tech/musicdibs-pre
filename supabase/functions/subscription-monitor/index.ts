import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const authHeader = req.headers.get("Authorization") || "";
  const cronHeader = req.headers.get("x-cron-secret") || "";
  const isAuth = authHeader === `Bearer ${serviceKey}` || (cronSecret && cronHeader === cronSecret);
  if (!isAuth) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  const anomalies: { type: string; severity: string; count: number; description: string }[] = [];

  try {
    // 1. Plan activo en profiles pero sin suscripcion activa (excluir migrados)
    const { data: activePlans } = await supabase.from("profiles").select("user_id, subscription_plan").in("subscription_plan", ["Annual", "Monthly"]);
    if (activePlans && activePlans.length > 0) {
      const userIds = activePlans.map((p: any) => p.user_id);
      const { data: activeSubs } = await supabase.from("subscriptions").select("user_id").in("user_id", userIds).eq("status", "active");
      const { data: migrated } = await supabase.from("credit_transactions").select("user_id").eq("type", "migration").in("user_id", userIds);
      const activeSubIds = new Set((activeSubs || []).map((s: any) => s.user_id));
      const migratedIds = new Set((migrated || []).map((m: any) => m.user_id));
      const noSub = activePlans.filter((p: any) => !activeSubIds.has(p.user_id) && !migratedIds.has(p.user_id));
      if (noSub.length > 0) anomalies.push({ type: "plan_activo_sin_suscripcion", severity: "warning", count: noSub.length, description: `${noSub.length} usuarios tienen plan Annual/Monthly pero NO tienen fila activa en subscriptions (excluidos migrados WP).` });
    }

    // 2. Suscripciones vencidas >30 dias que siguen active
    const { data: expiredActive } = await supabase.from("subscriptions").select("user_id").eq("status", "active").lt("current_period_end", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    if (expiredActive && expiredActive.length > 0) anomalies.push({ type: "suscripciones_vencidas_activas", severity: "critical", count: expiredActive.length, description: `${expiredActive.length} suscripciones llevan >30 dias vencidas pero siguen activas. Posible fallo del cron de renovaciones.` });

    // 3. Usuarios Free con >50 creditos sin justificacion
    const { data: freeHigh } = await supabase.from("profiles").select("user_id").eq("subscription_plan", "Free").gt("available_credits", 50).limit(100);
    if (freeHigh && freeHigh.length > 0) {
      const userIds = freeHigh.map((p: any) => p.user_id);
      const { data: justified } = await supabase.from("credit_transactions").select("user_id").in("type", ["admin_adjustment", "migration"]).in("user_id", userIds);
      const justifiedIds = new Set((justified || []).map((t: any) => t.user_id));
      const suspicious = freeHigh.filter((p: any) => !justifiedIds.has(p.user_id));
      if (suspicious.length > 0) anomalies.push({ type: "free_con_creditos_altos", severity: "warning", count: suspicious.length, description: `${suspicious.length} usuarios Free tienen >50 creditos sin migracion ni ajuste admin.` });
    }

    // 4. past_due >14 dias sin resolver
    const { data: stalePastDue } = await supabase.from("subscriptions").select("user_id").eq("status", "past_due").lt("updated_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());
    if (stalePastDue && stalePastDue.length > 0) anomalies.push({ type: "past_due_sin_resolver", severity: "warning", count: stalePastDue.length, description: `${stalePastDue.length} suscripciones llevan >14 dias en past_due. Stripe probablemente ya las cancelo.` });

    // 5. Creditos negativos
    const { data: negCred } = await supabase.from("profiles").select("user_id").lt("available_credits", 0);
    if (negCred && negCred.length > 0) anomalies.push({ type: "creditos_negativos", severity: "critical", count: negCred.length, description: `${negCred.length} usuarios tienen creditos NEGATIVOS. Revisar urgentemente.` });

    // Stats semanales
    const { data: activeSubs } = await supabase.from("subscriptions").select("user_id").eq("status", "active");
    const { data: weekOrders } = await supabase.from("orders").select("id").gte("paid_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    const { data: weekUsers } = await supabase.from("profiles").select("user_id").gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const criticals = anomalies.filter(a => a.severity === "critical");
    const warnings = anomalies.filter(a => a.severity === "warning");
    const hasAnomalies = anomalies.length > 0;
    const anomalyRows = anomalies.map(a => { const icon = a.severity === "critical" ? "🔴" : "🟡"; const bg = a.severity === "critical" ? "#fef2f2" : "#fffbeb"; const border = a.severity === "critical" ? "#fca5a5" : "#fde68a"; return `${icon} ${a.type.replace(/_/g,' ').toUpperCase()} — ${a.count} casos
${a.description}`; }).join("");
    const subject = hasAnomalies ? `${criticals.length > 0 ? "🚨" : "⚠️"} Monitoring MusicDibs — ${criticals.length} criticos, ${warnings.length} avisos` : "✅ Monitoring MusicDibs — Todo OK";
    const html = `

📊 Monitoring Semanal — MusicDibs

${new Date().toLocaleDateString("es-ES",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}

📈 Resumen de la semana

Suscriptores activos${(activeSubs||[]).length}Pedidos ultimos 7 dias${(weekOrders||[]).length}Nuevos usuarios (7 dias)${(weekUsers||[]).length}

${hasAnomalies ? `

⚠️ Anomalias detectadas (${anomalies.length})

${anomalyRows}

⚠️ Solo lectura — ningun dato fue modificado automaticamente.

` : `

✅ No se detectaron anomalias. Todo funciona correctamente.

`}

MusicDibs Monitoring · Panel Admin

`;

    await supabase.rpc("enqueue_email", { queue_name: "transactional_emails", payload: { idempotency_key: `monitoring-weekly-${new Date().toISOString().slice(0,10)}`, message_id: crypto.randomUUID(), to: "info@musicdibs.com", from: "MusicDibs <noreply@notify.musicdibs.com>", sender_domain: "notify.musicdibs.com", subject, html, purpose: "transactional", label: "monitoring_weekly", queued_at: new Date().toISOString() } });

    console.log(`[MONITORING] ${subject}`);
    return json({ ok: true, anomalies_count: anomalies.length, criticals: criticals.length, warnings: warnings.length, anomalies });
  } catch (e: any) {
    console.error("[MONITORING] Fatal:", e);
    return json({ error: e?.message || "Internal error" }, 500);
  }
});
