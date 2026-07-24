// Reporte semanal (lunes 9:00 CET/CEST aprox.) de suscripciones ANUALES
// (excepto annual_20) que han pasado a un estado distinto de "active" en
// Stripe -- impago, cancelacion, incomplete_expired, etc. -- para que el
// equipo pueda desactivarlos manualmente en la plataforma de distribucion
// (Sonosuite). La fuente de verdad es Stripe, no nuestra DB local.
//
// Modo por defecto: solo suscripciones cuya transicion a estado no-activo
// (canceled_at / ended_at, o su creacion si es incomplete_expired sin
// ninguno de los dos) cayo en los ultimos 7 dias.
// Modo `{ "all_time": true }`: sin filtro de fecha -- pensado para el
// primer envio, aplicado a todo el historico.
import { createClient } from "../_shared/supabase-client.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const REPORT_RECIPIENTS = ["info@musicdibs.com", "marketing@musicdibs.com"];

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const authHeader = req.headers.get("Authorization") || "";
  const cronHeader = req.headers.get("x-cron-secret") || "";
  const isAuth = authHeader === `Bearer ${serviceKey}` || (!!cronSecret && cronHeader === cronSecret);
  if (!isAuth) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let allTime = false;
  try {
    const body = await req.json().catch(() => ({}));
    allTime = body?.all_time === true;
  } catch { /* no body, defaults apply */ }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = Date.now();
  const weekAgoSeconds = Math.floor((now - 7 * 24 * 60 * 60 * 1000) / 1000);

  type Row = { email: string; planId: string; status: string; whenISO: string };
  const rows: Row[] = [];

  try {
    let startingAfter: string | undefined;
    let pageCount = 0;
    while (true) {
      pageCount++;
      if (pageCount > 200) {
        console.warn("[DIST-REPORT] Safety stop: too many pages, aborting pagination");
        break;
      }
      const page = await stripe.subscriptions.list({
        status: "all",
        limit: 100,
        expand: ["data.items.data.price"],
        starting_after: startingAfter,
      });

      for (const sub of page.data) {
        if (sub.status === "active") continue;

        const price = sub.items?.data?.[0]?.price as any;
        const planId = price?.metadata?.musicdibs_plan_id as string | undefined;
        if (!planId || !planId.startsWith("annual_") || planId === "annual_20") continue;

        // Momento relevante de la transicion a no-activo.
        const relevantEpoch = sub.canceled_at ?? sub.ended_at ?? sub.created;
        if (!allTime && relevantEpoch < weekAgoSeconds) continue;

        const customerId = typeof sub.customer === "string" ? sub.customer : (sub.customer as any)?.id;
        if (!customerId) continue;

        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        let email: string | null = null;
        if (profile?.user_id) {
          const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id);
          email = user?.email ?? null;
        }
        if (!email) {
          console.warn(`[DIST-REPORT] No se encontro email MusicDibs para customer ${customerId} (sub ${sub.id}), se omite del CSV`);
          continue;
        }

        rows.push({
          email,
          planId,
          status: sub.status,
          whenISO: new Date(relevantEpoch * 1000).toISOString(),
        });
      }

      if (!page.has_more) break;
      startingAfter = page.data[page.data.length - 1]?.id;
    }
  } catch (e: any) {
    console.error("[DIST-REPORT] Error listando suscripciones de Stripe:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Deduplicar por email+planId (una suscripcion podria aparecer una sola
  // vez, pero por seguridad ante reintentos de paginacion).
  const seen = new Set<string>();
  const dedupedRows = rows.filter((r) => {
    const key = `${r.email}|${r.planId}|${r.whenISO}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const csvLines = ["email,tipo_suscripcion,estado_stripe,fecha_baja"];
  for (const r of dedupedRows) {
    csvLines.push([csvEscape(r.email), csvEscape(r.planId), csvEscape(r.status), csvEscape(r.whenISO)].join(","));
  }
  const csvContent = csvLines.join("\n");
  const csvBase64 = btoa(unescape(encodeURIComponent(csvContent)));

  const todayStr = new Date().toISOString().slice(0, 10);
  const filename = `bajas-anuales-distribucion-${todayStr}${allTime ? "-historico" : ""}.csv`;

  const subject = allTime
    ? `[MusicDibs] Historico completo de bajas/cancelaciones de suscripciones anuales (${dedupedRows.length})`
    : `[MusicDibs] Bajas de suscripciones anuales esta semana (${dedupedRows.length})`;

  const html = `
    <h2>Bajas/cancelaciones de suscripciones anuales</h2>
    <p>${allTime
      ? "Este es el envio inicial con el <strong>historico completo</strong> de suscripciones anuales (excepto annual_20) que no estan actualmente en estado activo en Stripe."
      : "Suscripciones anuales (excepto annual_20) que han pasado a un estado distinto de 'active' en Stripe durante los <strong>ultimos 7 dias</strong>."
    }</p>
    <p><strong>${dedupedRows.length}</strong> usuario(s) en el CSV adjunto. Revisar y desactivar manualmente en la plataforma de distribucion (Sonosuite) segun corresponda.</p>
    <p style="color:#888;font-size:12px;">Fuente de verdad: Stripe (stripe.subscriptions.list, todos los estados excepto 'active'). Generado automaticamente por MusicDibs.</p>
  `;
  const text = `Bajas/cancelaciones de suscripciones anuales\n\n${dedupedRows.length} usuario(s) en el CSV adjunto.\n\nFuente de verdad: Stripe.`;

  const messageId = crypto.randomUUID();
  await supabase.from("email_send_log").insert({
    message_id: messageId,
    template_name: "distribution_deactivation_report",
    recipient_email: REPORT_RECIPIENTS.join(", "),
    status: "pending",
  });

  const { error: enqueueErr } = await supabase.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      idempotency_key: `dist-deactivation-report-${todayStr}${allTime ? "-historico" : ""}`,
      message_id: messageId,
      to: REPORT_RECIPIENTS,
      from: "MusicDibs <noreply@notify.musicdibs.com>",
      sender_domain: "notify.musicdibs.com",
      subject,
      html,
      text,
      attachments: [{ filename, content: csvBase64 }],
      purpose: "transactional",
      label: "distribution_deactivation_report",
      queued_at: new Date().toISOString(),
    },
  });

  if (enqueueErr) {
    console.error("[DIST-REPORT] Error al encolar el email:", enqueueErr);
    return new Response(JSON.stringify({ error: enqueueErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true, rows: dedupedRows.length, all_time: allTime }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
