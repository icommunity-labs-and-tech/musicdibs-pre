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

        // Marcar como failed y devolver credito
        const { error: updateErr } = await supabaseAdmin
          .from("works")
          .update({
            status: "failed",
            failure_reason: "stuck_processing_auto_recovered",
            updated_at: new Date().toISOString(),
          })
          .eq("id", work.id)
          .eq("status", "processing"); // solo si sigue en processing (evita race con ejecucion tardia)

        if (updateErr) {
          errors.push(`${work.id}: ${updateErr.message}`);
          continue;
        }

        // Devolver 1 credito (coste estandar de registro)
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("available_credits")
          .eq("user_id", work.user_id)
          .single();

        if (profile) {
          await supabaseAdmin
            .from("profiles")
            .update({ available_credits: profile.available_credits + 1, updated_at: new Date().toISOString() })
            .eq("user_id", work.user_id);

          await supabaseAdmin.from("credit_transactions").insert({
            user_id: work.user_id,
            amount: 1,
            type: "admin_adjustment",
            description: `Devolucion automatica: registro "${work.title}" atascado en processing >${STUCK_THRESHOLD_MINUTES}min sin avanzar a iBS`,
          });
        }

        console.log(`[STUCK-RECOVERY] Work ${work.id} recuperado - marcado failed, credito devuelto`);
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
