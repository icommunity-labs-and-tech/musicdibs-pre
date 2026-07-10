import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

// Obras en 'processing' sin ibs_evidence_id durante mas de este umbral
// se consideran huerfanas (la ejecucion de register-work-ibs se corto
// silenciosamente tras marcar processing y antes de completar el PASO 1 de iBS).
const STUCK_THRESHOLD_MINUTES = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== Deno.env.get("CRON_SECRET")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const threshold = new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000).toISOString();

    // Buscar obras huerfanas: processing, sin evidencia IBS, sin entrada en cola,
    // actualizadas hace mas de STUCK_THRESHOLD_MINUTES
    const { data: stuckWorks, error: fetchErr } = await supabaseAdmin
      .from("works")
      .select("id, user_id, title, updated_at")
      .eq("status", "processing")
      .is("ibs_evidence_id", null)
      .lt("updated_at", threshold);

    if (fetchErr) {
      console.error("[STUCK-RECOVERY] Error fetching stuck works:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!stuckWorks || stuckWorks.length === 0) {
      return new Response(JSON.stringify({ ok: true, recovered: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let recovered = 0;
    const errors: string[] = [];

    // Coste real del registro (single source of truth: operation_pricing)
    let creditCost = 1;
    try {
      const { data: pricing } = await supabaseAdmin
        .from("operation_pricing")
        .select("credits_cost")
        .eq("operation_key", "register_work")
        .eq("is_active", true)
        .maybeSingle();
      if (pricing?.credits_cost != null) creditCost = pricing.credits_cost;
    } catch (_) { /* fallback 1 */ }

    for (const work of stuckWorks) {
      try {
        // Verificar que no tenga entrada en ibs_sync_queue (si la tiene, el
        // PASO 1 SI se completo y el ibs-sync-cron se encargara normalmente)
        const { data: queueEntry } = await supabaseAdmin
          .from("ibs_sync_queue")
          .select("id")
          .eq("work_id", work.id)
          .maybeSingle();

        if (queueEntry) {
          console.log(`[STUCK-RECOVERY] Work ${work.id} tiene entrada en queue, no es huerfana - skip`);
          continue;
        }

        // Marcar como failed SOLO si sigue en processing sin evidencia iBS.
        // .select() para conocer las filas afectadas: si el registro termino
        // entre la lectura y el update, matched=0 y NO reembolsamos.
        const { data: updatedRows, error: updateErr } = await supabaseAdmin
          .from("works")
          .update({
            status: "failed",
            failure_reason: "stuck_processing_auto_recovered",
            updated_at: new Date().toISOString(),
          })
          .eq("id", work.id)
          .eq("status", "processing")
          .is("ibs_evidence_id", null)
          .select("id");

        if (updateErr) {
          errors.push(`${work.id}: ${updateErr.message}`);
          continue;
        }

        if (!updatedRows || updatedRows.length === 0) {
          console.log(`[STUCK-RECOVERY] Work ${work.id} ya no esta en processing (registrado o fallado entre la lectura y el update) — skip refund`);
          continue;
        }

        // Idempotencia: si ya existe un refund para este work, no duplicar
        const { data: existingRefund } = await supabaseAdmin
          .from("credit_transactions")
          .select("id")
          .eq("user_id", work.user_id)
          .in("type", ["refund", "admin_adjustment"])
          .ilike("description", `%${work.id}%`)
          .maybeSingle();

        if (existingRefund) {
          console.log(`[STUCK-RECOVERY] Refund already exists for ${work.id}, skipping`);
          recovered++;
          continue;
        }

        // Devolver credito usando refund_credits_ordered (misma RPC que la
        // ruta normal de fallo iBS). Como no sabemos que porcion vino del
        // bucket permanente (deduct_credits_ordered no persiste el split),
        // asumimos p_from_permanent=creditCost para NO degradar creditos
        // permanentes a expirables (favorece al usuario en el edge case).
        const { error: refundErr } = await supabaseAdmin.rpc("refund_credits_ordered", {
          p_user_id: work.user_id,
          p_amount: creditCost,
          p_from_permanent: creditCost,
          p_reason: `Reembolso automatico [${work.id}]: "${work.title}" atascado en processing >${STUCK_THRESHOLD_MINUTES}min sin avanzar a iBS`,
        });

        if (refundErr) {
          errors.push(`${work.id}: refund_rpc: ${refundErr.message}`);
          console.error(`[STUCK-RECOVERY] refund RPC failed for ${work.id}:`, refundErr.message);
          continue;
        }

        console.log(`[STUCK-RECOVERY] Work ${work.id} recuperado - marcado failed, ${creditCost} credito(s) devuelto(s)`);
        recovered++;
      } catch (workErr) {
        errors.push(`${work.id}: ${workErr}`);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, checked: stuckWorks.length, recovered, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[STUCK-RECOVERY] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
