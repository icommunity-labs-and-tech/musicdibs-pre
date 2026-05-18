import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";

const IBS_API_URL = "https://api.icommunitylabs.com/v2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth: aceptar pg_cron (x-cron-secret) o admin autenticado ─────
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    const authHeader = req.headers.get("Authorization");

    if (!expectedSecret) {
      console.error("[IBS-SYNC-CRON] CRON_SECRET not configured");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let authorized = cronSecret === expectedSecret;
    let isAdminCall = false;
    let targetUserId: string | null = null;
    let force = false;

    if (!authorized && authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: userData } = await userClient.auth.getUser();
      if (userData?.user) {
        const { data: roleRow } = await userClient
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (roleRow) {
          authorized = true;
          isAdminCall = true;
        }
      }
    }

    if (!authorized) {
      console.warn("[IBS-SYNC-CRON] Unauthorized call");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isAdminCall) {
      try {
        const body = await req.json();
        if (body && typeof body === "object") {
          if (typeof body.user_id === "string") targetUserId = body.user_id;
          if (body.force === true) force = true;
        }
      } catch {
        // no body, ok
      }
    }

    const IBS_API_KEY = Deno.env.get("IBS_API_KEY");
    if (!IBS_API_KEY) throw new Error("IBS_API_KEY not configured");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const ibsHeaders = {
      Authorization: `Bearer ${IBS_API_KEY}`,
      "Content-Type": "application/json",
    };

    const summary = {
      processed: 0,
      resolved: 0,
      retrying: 0,
      exhausted: 0,
      completed: 0,
      complete_failed: 0,
    };

    // ── FASE 1: Procesar pending_complete (de uno en uno, con delay) ──
    let pcQuery = supabaseAdmin
      .from("ibs_sync_queue")
      .select("*")
      .eq("status", "pending_complete")
      .order("created_at", { ascending: true })
      .limit(10);
    if (targetUserId) pcQuery = pcQuery.eq("user_id", targetUserId);
    const { data: pendingComplete } = await pcQuery;

    for (let i = 0; i < (pendingComplete?.length || 0); i++) {
      const item = pendingComplete![i];
      // delay entre confirmaciones para no saturar iBS (no en la primera)
      if (i > 0) await new Promise((r) => setTimeout(r, 5000));

      try {
        const completeRes = await fetch(
          `${IBS_API_URL}/evidences/uploads/${item.ibs_evidence_id}/complete`,
          { method: "POST", headers: ibsHeaders, body: JSON.stringify({}) },
        );

        if (completeRes.ok) {
          const result = await completeRes.json();
          const finalEvidenceId = result.id;
          await supabaseAdmin.from("works").update({
            ibs_evidence_id: finalEvidenceId,
            updated_at: new Date().toISOString(),
          }).eq("id", item.work_id);

          await supabaseAdmin.from("ibs_sync_queue").update({
            status: "waiting",
            ibs_evidence_id: finalEvidenceId,
            updated_at: new Date().toISOString(),
          }).eq("id", item.id);

          summary.completed++;
          console.log(`[IBS-SYNC] Complete OK ${item.work_id} → ${finalEvidenceId}`);
        } else {
          const errText = await completeRes.text().catch(() => "unknown");
          const newRetry = (item.retry_count || 0) + 1;
          const exhaustedNow = newRetry >= (item.max_retries || 3);
          await supabaseAdmin.from("ibs_sync_queue").update({
            retry_count: newRetry,
            status: exhaustedNow ? "exhausted" : "pending_complete",
            error_detail: `complete ${completeRes.status}: ${errText.slice(0, 300)}`,
            last_retry_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", item.id);
          summary.complete_failed++;
          console.warn(`[IBS-SYNC] Complete failed ${item.work_id} [${completeRes.status}]: ${errText.slice(0, 200)}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "network error";
        const newRetry = (item.retry_count || 0) + 1;
        const exhaustedNow = newRetry >= (item.max_retries || 3);
        await supabaseAdmin.from("ibs_sync_queue").update({
          retry_count: newRetry,
          status: exhaustedNow ? "exhausted" : "pending_complete",
          error_detail: `complete network: ${msg}`,
          last_retry_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", item.id);
        summary.complete_failed++;
      }
    }

    // ── FASE 2: Polling de estado (waiting/retrying) ──────────────────
    let q = supabaseAdmin
      .from("ibs_sync_queue")
      .select("*")
      .in("status", ["waiting", "retrying"])
      .limit(50);
    if (!force) {
      q = q.lt("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString());
    }
    if (targetUserId) {
      q = q.eq("user_id", targetUserId);
    }
    const { data: items, error } = await q;

    if (error) throw error;
    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify(summary),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    summary.processed = items.length;


    for (const item of items) {
      try {
        const ibsRes = await fetch(`${IBS_API_URL}/evidences/${item.ibs_evidence_id}`, {
          headers: { Authorization: `Bearer ${IBS_API_KEY}` },
        });

        if (ibsRes.ok) {
          const evidence = await ibsRes.json();
          const certification = evidence.certification || evidence.payload?.certification;

          if (evidence.status === "certified" && certification) {
            // Resolve — update work to registered
            const checkerUrl =
              certification.links?.checker ||
              (certification.hash && certification.network
                ? `https://checker.icommunitylabs.com/check/${certification.network}/${certification.hash}`
                : undefined);

            await supabaseAdmin
              .from("works")
              .update({
                status: "registered",
                blockchain_hash: certification.hash,
                blockchain_network: certification.network || "polygon",
                checker_url: checkerUrl,
                certificate_url: checkerUrl,
                certified_at: certification.timestamp || new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", item.work_id);

            await supabaseAdmin
              .from("ibs_sync_queue")
              .update({ status: "resolved", updated_at: new Date().toISOString() })
              .eq("id", item.id);

            summary.resolved++;
            console.log(`[IBS-SYNC] Resolved work ${item.work_id} via cron`);
          } else {
            // Not yet certified — retry or exhaust
            await handleRetryOrExhaust(supabaseAdmin, item, summary, "Not yet certified");
          }
        } else {
          // iBS error — retry or exhaust
          const errText = await ibsRes.text().catch(() => "unknown");
          // Raise admin alert on 5xx errors from iBS
          if (ibsRes.status >= 500) {
            await supabaseAdmin.from("admin_alerts").insert({
              source: "ibs_certification",
              severity: "error",
              message: `iBS devolvió HTTP ${ibsRes.status} al verificar evidence ${item.ibs_evidence_id}`,
              context: {
                http_status: ibsRes.status,
                ibs_evidence_id: item.ibs_evidence_id,
                work_id: item.work_id,
                queue_id: item.id,
                user_id: item.user_id,
                retry_count: item.retry_count,
                max_retries: item.max_retries,
                response: errText.slice(0, 500),
              },
            });
          }
          await handleRetryOrExhaust(supabaseAdmin, item, summary, `iBS ${ibsRes.status}: ${errText}`);
        }
      } catch (fetchErr) {
        // Network error — retry or exhaust
        const msg = fetchErr instanceof Error ? fetchErr.message : "network error";
        await handleRetryOrExhaust(supabaseAdmin, item, summary, msg);
      }
    }

    console.log(`[IBS-SYNC] Summary:`, JSON.stringify(summary));
    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[IBS-SYNC] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

async function handleRetryOrExhaust(
  supabaseAdmin: ReturnType<typeof createClient>,
  item: any,
  summary: { retrying: number; exhausted: number },
  reason: string,
) {
  if (item.retry_count < item.max_retries) {
    await supabaseAdmin
      .from("ibs_sync_queue")
      .update({
        status: "retrying",
        retry_count: item.retry_count + 1,
        last_retry_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);
    summary.retrying++;
    console.log(`[IBS-SYNC] Retrying ${item.work_id} (${item.retry_count + 1}/${item.max_retries}): ${reason}`);
  } else {
    await supabaseAdmin
      .from("ibs_sync_queue")
      .update({
        status: "exhausted",
        error_detail: `Max retries reached — ${reason}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    // Mark work as failed — DB trigger `auto_refund_on_work_failure`
    // is the single source of truth for refunding the credit. Do NOT
    // refund here or we get duplicate refunds.
    await supabaseAdmin
      .from("works")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", item.work_id);

    // Raise admin alert: certification definitively failed and credit refunded
    await supabaseAdmin.from("admin_alerts").insert({
      source: "ibs_certification",
      severity: "critical",
      message: `Certificación iBS agotada para evidence ${item.ibs_evidence_id} (work ${item.work_id}). Crédito reembolsado.`,
      context: {
        ibs_evidence_id: item.ibs_evidence_id,
        work_id: item.work_id,
        queue_id: item.id,
        user_id: item.user_id,
        retry_count: item.retry_count,
        max_retries: item.max_retries,
        reason,
        refunded: true,
      },
    });

    summary.exhausted++;
    console.log(`[IBS-SYNC] Exhausted ${item.work_id}: ${reason}`);
  }
}
