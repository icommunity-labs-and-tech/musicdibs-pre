import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

// Obras en 'processing' sin ibs_evidence_id durante mas de este umbral
// se consideran huerfanas (la ejecucion de register-work-ibs se corto
// silenciosamente tras marcar processing y antes de completar el PASO 1 de iBS).
const STUCK_THRESHOLD_MINUTES = 5;

// FIX 2026-07-10 (issues Lovable #2 y #3):
// #2 - Refund fantasma: el UPDATE que marca "failed" ahora anade .is("ibs_evidence_id", null)
//      y usa .select() para saber si realmente afecto la fila. Si el work se registro
//      justo en el hueco entre el SELECT inicial y este UPDATE (evidence_id ya escrito
//      pero status aun 'processing', antes del insert en ibs_sync_queue), el UPDATE ya
//      no lo pisa y no se reembolsa un credito para un registro exitoso.
// #3 - Degradacion permanente->expirable: en vez de sumar a mano a available_credits
//      (que siempre se trata como credito de plan/expirable), ahora se usa la misma
//      RPC refund_credits_ordered que usa register-work-ibs/handleIbsFailure, con
//      p_from_permanent = creditCost. Esto favorece al usuario en el caso ambiguo:
//      si el credito original era permanente lo recupera correctamente como tal; si
//      era del plan mensual, gana un permanente en vez de perder uno ya pagado --
//      preferible sobre-compensar en este edge case a que el usuario pierda un
//      credito por el que pago. Tambien se anade idempotencia (no duplicar refund
//      si ya existe una transaccion admin_adjustment/refund mencionando el work.id)
//      y el coste real se lee de feature_costs en vez de ir hardcodeado a +1.

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

    // Coste real de registro (antes hardcodeado a +1 siempre)
    let creditCost = 1;
    const { data: costRow } = await supabaseAdmin
      .from("feature_costs").select("credit_cost")
      .eq("feature_key", "register_work").maybeSingle();
    if (costRow) creditCost = costRow.credit_cost;

    let recovered = 0;
    let skippedAlreadyRegistered = 0;
    const errors: string[] = [];

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

        // Idempotencia: si ya existe un reembolso (refund o admin_adjustment)
        // mencionando este work.id, no duplicar.
        const { data: existingRefund } = await supabaseAdmin
          .from("credit_transactions")
          .select("id")
          .eq("user_id", work.user_id)
          .in("type", ["refund", "admin_adjustment"])
          .ilike("description", `%${work.id}%`)
          .maybeSingle();
        if (existingRefund) {
          console.log(`[STUCK-RECOVERY] Work ${work.id} ya tiene un reembolso registrado, skip`);
          continue;
        }

        // FIX #2: marcar como failed SOLO si sigue en processing Y sigue sin
        // ibs_evidence_id (evita pisar un registro que se completo justo en el
        // hueco entre el SELECT de arriba y este UPDATE). .select() para saber
        // si realmente afecto alguna fila antes de reembolsar.
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
          console.log(`[STUCK-RECOVERY] Work ${work.id} ya no calificaba (registrado justo a tiempo o estado cambiado) -- NO se marca failed ni se reembolsa.`);
          skippedAlreadyRegistered++;
          continue;
        }

        // FIX #3: usar refund_credits_ordered (misma RPC que handleIbsFailure en
        // register-work-ibs) en vez de sumar a mano a available_credits, que
        // siempre degradaba el credito a "expirable" aunque el original fuera
        // permanente. p_from_permanent = creditCost favorece al usuario: si el
        // original era del plan, gana un permanente (sobre-compensa) en vez de
        // perder un credito ya pagado.
        const { error: refundError } = await supabaseAdmin.rpc("refund_credits_ordered", {
          p_user_id: work.user_id,
          p_amount: creditCost,
          p_from_permanent: creditCost,
          p_reason: `Devolucion automatica [${work.id}]: registro "${work.title}" atascado en processing >${STUCK_THRESHOLD_MINUTES}min sin avanzar a iBS`,
        });

        if (refundError) {
          errors.push(`${work.id}: refund error - ${refundError.message}`);
          continue;
        }

        console.log(`[STUCK-RECOVERY] Work ${work.id} recuperado - marcado failed, ${creditCost} credito(s) devuelto(s)`);
        recovered++;
      } catch (workErr) {
        errors.push(`${work.id}: ${workErr}`);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, checked: stuckWorks.length, recovered, skippedAlreadyRegistered, errors }),
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
