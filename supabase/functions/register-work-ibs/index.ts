import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const IBS_API_URL = "https://api.icommunitylabs.com/v2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * register-work-ibs v224 — flujo presigned GCS (3 pasos, sin base64 en memoria)
 *
 * PASO 1: POST /v2/evidences/uploads  → sesión + URLs presignadas GCS
 * PASO 2: PUT  <url_gcs>              → subir archivo directamente a GCS (stream)
 * PASO 3: POST /v2/evidences/uploads/{id}/complete → confirmar
 *
 * Soporta archivos de hasta 5 GiB sin cargar nada en memoria del worker.
 * NO usa base64 en ningún momento.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ctx: {
    supabaseAdmin: ReturnType<typeof createClient> | null;
    workId: string | null;
    userId: string | null;
    workTitle: string;
    creditCost: number;
    deducted: boolean;
  } = {
    supabaseAdmin: null,
    workId: null,
    userId: null,
    workTitle: "",
    creditCost: 0,
    deducted: false,
  };

  try {
    const IBS_API_KEY = Deno.env.get("IBS_API_KEY");
    if (!IBS_API_KEY) throw new Error("IBS_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    ctx.supabaseAdmin = supabaseAdmin;

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    ctx.userId = user.id;
    const { workId, signatureId, additionalFilePaths } = await req.json();
    ctx.workId = workId;

    if (!workId || typeof workId !== "string") {
      return new Response(JSON.stringify({ error: "workId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!signatureId || typeof signatureId !== "string") {
      await markDraftAsFailed(supabaseAdmin, workId, "missing_signature_id");
      return new Response(JSON.stringify({ error: "signatureId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: work, error: workError } = await supabaseAdmin
      .from("works")
      .select("id, user_id, title, description, status, file_path, file_hash, file_hash_sha512_b64")
      .eq("id", workId).single();

    if (workError || !work) {
      return new Response(JSON.stringify({ error: "Work not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    ctx.workTitle = work.title;

    if (work.user_id !== user.id) {
      const { data: managedWork } = await supabaseAdmin
        .from("managed_works").select("id")
        .eq("work_id", workId).eq("manager_user_id", user.id).maybeSingle();
      if (!managedWork) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Lock atómico ──────────────────────────────────────────────────
    const { data: locked } = await supabaseAdmin
      .from("works")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", workId).eq("status", "draft")
      .select("id").maybeSingle();

    if (!locked) {
      console.log(`[IBS] Work ${workId} already processing (status: ${work.status})`);
      return new Response(
        JSON.stringify({ error: "Work already being processed", status: work.status }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Créditos ──────────────────────────────────────────────────────
    let creditCost = 1;
    const { data: costRow } = await supabaseAdmin
      .from("feature_costs").select("credit_cost")
      .eq("feature_key", "register_work").maybeSingle();
    if (costRow) creditCost = costRow.credit_cost;
    ctx.creditCost = creditCost;

    const { data: profile } = await supabaseAdmin
      .from("profiles").select("available_credits")
      .eq("user_id", user.id).single();

    if (!profile || profile.available_credits < creditCost) {
      await markDraftAsFailed(supabaseAdmin, workId, "insufficient_credits");
      return new Response(
        JSON.stringify({ error: "Créditos insuficientes", available: profile?.available_credits || 0, required: creditCost }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabaseAdmin.from("profiles")
      .update({ available_credits: profile.available_credits - creditCost, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    await supabaseAdmin.from("credit_transactions").insert({
      user_id: user.id, amount: -creditCost, type: "usage", description: `Registro: ${work.title}`,
    });
    ctx.deducted = true;
    console.log(`[IBS] Credit deducted for work ${workId}: ${creditCost}`);

    // ── Metadatos de archivos (HEAD, sin descargar) ───────────────────
    const allFilePaths: string[] = [work.file_path, ...(Array.isArray(additionalFilePaths) ? additionalFilePaths : [])];

    const filesMeta: Array<{ path: string; name: string; size: number; contentType: string; signedUrl: string }> = [];

    for (const fp of allFilePaths) {
      const { data: urlData } = await supabaseAdmin.storage.from("works-files").createSignedUrl(fp, 1800);
      if (!urlData?.signedUrl) { console.warn(`[IBS] No signed URL for ${fp}`); continue; }
      const head = await fetch(urlData.signedUrl, { method: "HEAD" });
      const size = parseInt(head.headers.get("content-length") || "0", 10);
      const ct = head.headers.get("content-type") || "application/octet-stream";
      if (!size) { console.warn(`[IBS] File ${fp} has size=0, skipping`); continue; }
      const name = (fp.split("/").pop() || "file").replace(/^\d+_/, "");
      filesMeta.push({ path: fp, name, size, contentType: ct, signedUrl: urlData.signedUrl });
      console.log(`[IBS] File: ${name} | ${(size/1024/1024).toFixed(1)}MB | ${ct}`);
    }

    if (filesMeta.length === 0) {
      await handleIbsFailure(supabaseAdmin, workId, user.id, work.title, "No valid files", creditCost);
      ctx.deducted = false;
      return new Response(
        JSON.stringify({ success: false, error: "No valid files", workId, status: "failed", refunded: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ibsHeaders = { "Authorization": `Bearer ${IBS_API_KEY}`, "Content-Type": "application/json" };

    // ── PASO 1: Crear sesión de upload en iBS ─────────────────────────
    const sessionBody = {
      title: work.title,
      ...(work.description ? { description: work.description } : {}),
      signatures: [{ id: signatureId }],
      files: filesMeta.map(f => ({ name: f.name, content_type: f.contentType, size: f.size })),
    };

    console.log(`[IBS] PASO 1 — Sesión upload para work ${workId}, ${filesMeta.length} archivo(s)`);
    const sessionRes = await fetch(`${IBS_API_URL}/evidences/uploads`, {
      method: "POST", headers: ibsHeaders, body: JSON.stringify(sessionBody),
    });

    if (!sessionRes.ok) {
      const errBody = await sessionRes.text();
      console.error(`[IBS] Sesión fallida [${sessionRes.status}]:`, errBody);
      await handleIbsFailure(supabaseAdmin, workId, user.id, work.title, `iBS session error ${sessionRes.status}: ${errBody.slice(0, 200)}`, creditCost);
      ctx.deducted = false;
      return new Response(
        JSON.stringify({ success: false, error: "iBS session failed", workId, status: "failed", refunded: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const session = await sessionRes.json();
    const sessionId = session.id;
    console.log(`[IBS] Sesión creada: ${sessionId}, expira: ${session.expires_at}`);

    // ── PASO 2: Subir cada archivo a GCS (streaming, sin base64) ─────
    for (let i = 0; i < filesMeta.length; i++) {
      const fileMeta = filesMeta[i];
      const uploadInfo = session.files[i]?.upload;

      if (!uploadInfo?.url) {
        await handleIbsFailure(supabaseAdmin, workId, user.id, work.title, `No upload URL for ${fileMeta.name}`, creditCost);
        ctx.deducted = false;
        return new Response(
          JSON.stringify({ success: false, error: "No upload URL", workId, status: "failed", refunded: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[IBS] PASO 2 — Subiendo ${fileMeta.name} (${(fileMeta.size/1024/1024).toFixed(1)}MB) a GCS...`);

      const fileRes = await fetch(fileMeta.signedUrl);
      if (!fileRes.ok || !fileRes.body) {
        await handleIbsFailure(supabaseAdmin, workId, user.id, work.title, `Download failed for ${fileMeta.name}`, creditCost);
        ctx.deducted = false;
        return new Response(
          JSON.stringify({ success: false, error: "File download failed", workId, status: "failed", refunded: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // PUT a GCS — streaming directo, SIN base64, SIN cargar en memoria
      const gcsRes = await fetch(uploadInfo.url, {
        method: "PUT",
        headers: {
          "Content-Type": uploadInfo.headers?.["Content-Type"] || fileMeta.contentType,
          "Content-Length": String(fileMeta.size),
        },
        body: fileRes.body,
        // @ts-ignore Deno soporta duplex streaming
        duplex: "half",
      });

      if (!gcsRes.ok) {
        const gcsErr = await gcsRes.text();
        console.error(`[IBS] GCS upload fallido [${gcsRes.status}]:`, gcsErr.slice(0, 200));
        await handleIbsFailure(supabaseAdmin, workId, user.id, work.title, `GCS upload error ${gcsRes.status}`, creditCost);
        ctx.deducted = false;
        return new Response(
          JSON.stringify({ success: false, error: "GCS upload failed", workId, status: "failed", refunded: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[IBS] ${fileMeta.name} subido a GCS ✅ (${gcsRes.status})`);
    }

    // ── PASO 3: Confirmar upload ───────────────────────────────────────
    console.log(`[IBS] PASO 3 — Confirmando sesión ${sessionId}`);
    const completeRes = await fetch(`${IBS_API_URL}/evidences/uploads/${sessionId}/complete`, {
      method: "POST", headers: ibsHeaders, body: JSON.stringify({}),
    });

    if (!completeRes.ok) {
      const errBody = await completeRes.text();
      console.error(`[IBS] Complete fallido [${completeRes.status}]:`, errBody);
      await handleIbsFailure(supabaseAdmin, workId, user.id, work.title, `iBS complete error ${completeRes.status}: ${errBody.slice(0, 200)}`, creditCost);
      ctx.deducted = false;
      return new Response(
        JSON.stringify({ success: false, error: "iBS complete failed", workId, status: "failed", refunded: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const completeResult = await completeRes.json();
    const evidenceId = completeResult.id;
    const evidenceLink = completeResult.link;
    console.log(`[IBS] Evidence confirmada: ${evidenceId}`);

    // ── Actualizar work ───────────────────────────────────────────────
    await supabaseAdmin.from("works").update({
      ibs_evidence_id: evidenceId,
      ibs_signature_id: signatureId,
      file_hash: work.file_hash || "",
      ibs_payload_checksum: work.file_hash_sha512_b64 || "",
      ibs_payload_algorithm: "SHA-512",
      updated_at: new Date().toISOString(),
    }).eq("id", workId);

    await supabaseAdmin.from("ibs_sync_queue").insert({
      work_id: workId, user_id: user.id, ibs_evidence_id: evidenceId, status: "waiting",
    });

    console.log(`[IBS] Work ${workId} → evidence ${evidenceId} ✅`);

    return new Response(
      JSON.stringify({ success: true, workId, evidenceId, evidenceLink, status: "processing" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e: any) {
    console.error("[IBS-REGISTER] Unhandled error:", e?.message || e);
    if (ctx.deducted && ctx.supabaseAdmin && ctx.workId && ctx.userId && ctx.creditCost > 0) {
      try {
        await handleIbsFailure(
          ctx.supabaseAdmin, ctx.workId, ctx.userId, ctx.workTitle,
          `crash: ${e?.message?.slice(0, 200) || "unknown"}`, ctx.creditCost
        );
        ctx.deducted = false;
        return new Response(
          JSON.stringify({ success: false, error: "Error interno — crédito reembolsado", workId: ctx.workId, status: "failed", refunded: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (refundErr) {
        console.error("[IBS-REGISTER] Refund after crash failed:", refundErr);
      }
    }
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleIbsFailure(
  supabaseAdmin: ReturnType<typeof createClient>,
  workId: string, userId: string, workTitle: string, reason: string, creditCost = 0
) {
  await supabaseAdmin.from("works")
    .update({ status: "failed", failure_reason: reason, updated_at: new Date().toISOString() })
    .eq("id", workId);
  if (creditCost > 0) {
    const { data: existing } = await supabaseAdmin
      .from("credit_transactions").select("id")
      .eq("user_id", userId).eq("type", "refund")
      .ilike("description", `%${workId}%`).maybeSingle();
    if (existing) { console.log(`[IBS] Refund already exists for ${workId}, skipping`); return; }
    const { data: p } = await supabaseAdmin.from("profiles").select("available_credits").eq("user_id", userId).single();
    if (p) {
      await supabaseAdmin.from("profiles")
        .update({ available_credits: p.available_credits + creditCost, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      await supabaseAdmin.from("credit_transactions").insert({
        user_id: userId, amount: creditCost, type: "refund",
        description: `Reembolso por fallo iBS [${workId}]: ${workTitle} — ${reason.slice(0, 80)}`,
      });
      console.log(`[IBS] Refunded ${creditCost} credit(s) for work ${workId}. Reason: ${reason}`);
    }
  }
}

async function markDraftAsFailed(
  supabaseAdmin: ReturnType<typeof createClient>, workId: string, reason: string
) {
  if (!workId) return;
  try {
    await supabaseAdmin.from("works")
      .update({ status: "failed", failure_reason: reason, updated_at: new Date().toISOString() })
      .eq("id", workId).eq("status", "draft");
    console.log(`[markDraftAsFailed] ${workId} -> failed (${reason})`);
  } catch (e) { console.error(`[markDraftAsFailed] exception:`, e); }
}
