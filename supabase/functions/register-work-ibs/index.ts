import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";

const IBS_API_URL = "https://api.icommunitylabs.com/v2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Registers a work as an evidence in iCommunity (iBS) blockchain.
 *
 * Uses presigned upload flow to avoid loading entire files into memory.
 * SHA-256 and SHA-512 are pre-computed client-side and stored in the works table.
 *
 * Body: { workId: string, signatureId: string, additionalFilePaths?: string[] }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Track credit deduction so the outer catch can refund on unexpected failures
  let _refundCtx: {
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
    if (!IBS_API_KEY) {
      throw new Error("IBS_API_KEY is not configured");
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const { workId, signatureId, additionalFilePaths } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (!workId || typeof workId !== "string") {
      return new Response(JSON.stringify({ error: "workId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!signatureId || typeof signatureId !== "string") {
      await markDraftAsFailed(supabaseAdmin, workId, "missing_signature_id");
      return new Response(JSON.stringify({ error: "signatureId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the work belongs to the user and is in draft state
    const { data: work, error: workError } = await supabaseAdmin
      .from("works")
      .select("id, user_id, title, description, status, file_path, file_hash, file_hash_sha512_b64")
      .eq("id", workId)
      .single();

    if (workError || !work) {
      return new Response(JSON.stringify({ error: "Work not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (work.user_id !== userId) {
      const { data: managedWork } = await supabaseAdmin
        .from("managed_works")
        .select("id")
        .eq("work_id", workId)
        .eq("manager_user_id", userId)
        .maybeSingle();

      if (!managedWork) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Atomic lock: reserve the work BEFORE deducting credits to prevent
    // double charges from concurrent client retries. Only succeeds if the
    // work is still in 'draft' status. The conditional UPDATE is atomic at
    // the row level in Postgres.
    const { data: locked, error: lockError } = await supabaseAdmin
      .from("works")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", workId)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();

    if (lockError || !locked) {
      console.warn(`[IBS] Lock not acquired for work ${workId} (current status: ${work.status}). Possible concurrent retry.`);
      return new Response(
        JSON.stringify({ error: "Work already being processed", status: work.status }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log(`[IBS] Atomic lock acquired for work ${workId}`);

    // ── Deduct credit NOW (before any iBS call) ──
    // Read cost from feature_costs table
    let creditCost = 1;
    const { data: costRow } = await supabaseAdmin
      .from("feature_costs")
      .select("credit_cost")
      .eq("feature_key", "register_work")
      .maybeSingle();
    if (costRow) creditCost = costRow.credit_cost;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("available_credits")
      .eq("user_id", userId)
      .single();

    if (!profile || profile.available_credits < creditCost) {
      await markDraftAsFailed(supabaseAdmin, workId, "insufficient_credits");
      return new Response(
        JSON.stringify({ error: "Créditos insuficientes", available: profile?.available_credits || 0, required: creditCost }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabaseAdmin
      .from("profiles")
      .update({ available_credits: profile.available_credits - creditCost, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    await supabaseAdmin.from("credit_transactions").insert({
      user_id: userId,
      amount: -creditCost,
      type: "usage",
      description: `Registro: ${work.title}`,
    });

    let creditDeducted = true;
    _refundCtx = {
      supabaseAdmin,
      workId,
      userId,
      workTitle: work.title,
      creditCost,
      deducted: true,
    };
    console.log(`[IBS] Credit deducted for work ${workId}: ${creditCost} credit(s)`);

    // Get a signed URL for the file (avoid downloading into memory)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from("works-files")
      .createSignedUrl(work.file_path, 600); // 10 min

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("[IBS] Signed URL error:", signedUrlError);
      return new Response(JSON.stringify({ error: "Could not access work file" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get file metadata without downloading the entire file
    const headRes = await fetch(signedUrlData.signedUrl, { method: "HEAD" });
    const fileSize = parseInt(headRes.headers.get("content-length") || "0", 10);
    const contentType = headRes.headers.get("content-type") || "application/octet-stream";
    const fileSizeMB = fileSize / (1024 * 1024);

    const rawFileName = work.file_path.split("/").pop() || "file";
    const fileName = rawFileName.replace(/^\d+_/, "");

    // Use pre-computed hashes from client
    const fileHash = work.file_hash || "";
    const ibsPayloadChecksum = work.file_hash_sha512_b64 || "";
    const ibsPayloadAlgorithm = "SHA-512";

    console.log(`[IBS] Work ${workId}: ${fileSizeMB.toFixed(1)}MB, hash available: ${!!fileHash}, sha512 available: ${!!ibsPayloadChecksum}`);

    const ibsHeaders = {
      "Authorization": `Bearer ${IBS_API_KEY}`,
      "Content-Type": "application/json",
    };

    // Gather all file paths
    const allFilePaths = [work.file_path];
    const extraPaths: string[] = Array.isArray(additionalFilePaths) ? additionalFilePaths : [];
    allFilePaths.push(...extraPaths);

    let evidenceId: string;
    let evidenceLink: string | undefined;

    // Use POST /v2/evidences directly with inline base64 files (per iBS support)
    console.log(`[IBS] Using POST /evidences (inline) for work ${workId} (${fileSizeMB.toFixed(1)}MB), ${allFilePaths.length} file(s)`);

    // Streaming base64 encoder: reads file in chunks from storage and encodes
    // incrementally to avoid loading the entire ArrayBuffer + a separate base64
    // string into memory at the same time (which caused worker OOM > 50MB).
    async function streamFileToBase64(url: string): Promise<string> {
      const res = await fetch(url);
      if (!res.ok || !res.body) {
        throw new Error(`fetch failed: ${res.status}`);
      }
      const reader = res.body.getReader();
      let out = "";
      let leftover = new Uint8Array(0);
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value || value.length === 0) continue;
        // Concatenate leftover (0..2 bytes) with new chunk
        const merged = new Uint8Array(leftover.length + value.length);
        merged.set(leftover, 0);
        merged.set(value, leftover.length);
        // Encode in multiples of 3 bytes; carry the rest to next iteration
        const usable = merged.length - (merged.length % 3);
        if (usable > 0) {
          // btoa needs a binary string — build it directly from this slice only
          let bin = "";
          const slice = merged.subarray(0, usable);
          const STEP = 0x8000;
          for (let i = 0; i < slice.length; i += STEP) {
            bin += String.fromCharCode(...slice.subarray(i, Math.min(i + STEP, slice.length)));
          }
          out += btoa(bin);
        }
        leftover = merged.subarray(usable);
      }
      // Flush remaining 0..2 bytes
      if (leftover.length > 0) {
        let bin = "";
        for (let i = 0; i < leftover.length; i++) bin += String.fromCharCode(leftover[i]);
        out += btoa(bin);
      }
      return out;
    }

    const inlineFiles: Array<{ name: string; file: string }> = [];
    for (const fp of allFilePaths) {
      const name = (fp.split("/").pop() || "file").replace(/^\d+_/, "");
      const { data: fpUrl } = await supabaseAdmin.storage.from("works-files").createSignedUrl(fp, 600);
      const url = fpUrl?.signedUrl;
      if (!url) {
        console.warn(`[IBS] Could not sign URL for "${fp}", skipping`);
        continue;
      }
      try {
        const b64 = await streamFileToBase64(url);
        if (!b64) {
          console.warn(`[IBS] File "${fp}" is empty, skipping`);
          continue;
        }
        inlineFiles.push({ name, file: b64 });
      } catch (err) {
        console.error(`[IBS] Failed to stream-encode "${fp}":`, err);
        continue;
      }
    }

    if (inlineFiles.length === 0) {
      await handleIbsFailure(supabaseAdmin, workId, userId, work.title, "No valid files to upload", creditCost);
      return new Response(
        JSON.stringify({ success: false, error: "No valid files", workId, status: "failed", refunded: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ibsPayload: Record<string, unknown> = {
      title: work.title,
      files: inlineFiles,
    };
    if (work.description) ibsPayload.description = work.description;

    const ibsRes = await fetch(`${IBS_API_URL}/evidences`, {
      method: "POST",
      headers: ibsHeaders,
      body: JSON.stringify({ payload: ibsPayload, signatures: [{ id: signatureId }] }),
    });

    if (!ibsRes.ok) {
      const errBody = await ibsRes.text();
      console.error(`[IBS] POST /evidences failed [${ibsRes.status}]:`, errBody);
      // Raise admin alert on iBS server errors so issues are visible in /dashboard/admin/alerts
      if (ibsRes.status >= 500) {
        await supabaseAdmin.from("admin_alerts").insert({
          source: "ibs_certification",
          severity: "error",
          message: `iBS devolvió HTTP ${ibsRes.status} al crear evidence para work ${workId}`,
          context: {
            http_status: ibsRes.status,
            work_id: workId,
            user_id: userId,
            work_title: work.title,
            signature_id: signatureId,
            response: errBody.slice(0, 500),
          },
        });
      }
      await handleIbsFailure(supabaseAdmin, workId, userId, work.title, `iBS error ${ibsRes.status}: ${errBody}`, creditCost);
      return new Response(
        JSON.stringify({ success: false, error: `iBS registration failed: ${errBody}`, workId, status: "failed", refunded: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const completeResult = await ibsRes.json();
    evidenceId = completeResult.id;
    evidenceLink = completeResult.link;

    // iBS accepted — now set status to 'processing' and store evidence info
    await supabaseAdmin
      .from("works")
      .update({
        status: "processing",
        ibs_evidence_id: evidenceId,
        ibs_signature_id: signatureId,
        file_hash: fileHash,
        ibs_payload_checksum: ibsPayloadChecksum,
        ibs_payload_algorithm: ibsPayloadAlgorithm,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workId);

    // Enqueue for resilience
    await supabaseAdmin.from("ibs_sync_queue").insert({
      work_id: workId,
      user_id: userId,
      ibs_evidence_id: evidenceId,
      status: "waiting",
    });

    console.log(`[IBS] Evidence created for work ${workId}: ${evidenceId}`);

    return new Response(
      JSON.stringify({
        success: true,
        workId,
        evidenceId,
        evidenceLink,
        status: "processing",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Internal error";
    console.error("[IBS-REGISTER] Error:", e);

    // CRITICAL: if credits were already deducted, refund them now so the user
    // does not lose credits when the function dies after deduction (e.g. OOM,
    // base64 encoding of large files, network errors with iBS, etc.).
    if (_refundCtx.deducted && _refundCtx.supabaseAdmin && _refundCtx.workId && _refundCtx.userId) {
      try {
        await handleIbsFailure(
          _refundCtx.supabaseAdmin,
          _refundCtx.workId,
          _refundCtx.userId,
          _refundCtx.workTitle,
          `unexpected_error: ${errMsg}`.slice(0, 480),
          _refundCtx.creditCost,
        );
        return new Response(
          JSON.stringify({
            success: false,
            error: errMsg,
            workId: _refundCtx.workId,
            status: "failed",
            refunded: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (refundErr) {
        console.error("[IBS-REGISTER] Refund attempt failed:", refundErr);
      }
    }

    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Inline upload fallback for very small files (< 5MB).
 */
async function handleInlineUpload(
  supabaseAdmin: ReturnType<typeof createClient>,
  work: { id: string; title: string; description?: string; file_path: string },
  signedUrl: string,
  signatureId: string,
  ibsHeaders: Record<string, string>,
  workId: string,
  userId: string,
  fileHash: string,
  ibsPayloadChecksum: string,
  ibsPayloadAlgorithm: string,
  corsHeaders: Record<string, string>,
  creditCost: number = 0,
) {
  const { encode: base64Encode } = await import("https://deno.land/std@0.168.0/encoding/base64.ts");

  const fileRes = await fetch(signedUrl);
  const fileBuffer = await fileRes.arrayBuffer();
  const fileBase64 = base64Encode(new Uint8Array(fileBuffer) as any);
  const fileName = (work.file_path.split("/").pop() || "file").replace(/^\d+_/, "");

  const ibsPayload: Record<string, unknown> = {
    title: work.title,
    files: [{ name: fileName, file: fileBase64 }],
  };
  if (work.description) ibsPayload.description = work.description;

  const ibsRes = await fetch("https://api.icommunitylabs.com/v2/evidences", {
    method: "POST",
    headers: ibsHeaders,
    body: JSON.stringify({ payload: ibsPayload, signatures: [{ id: signatureId }] }),
  });

  if (!ibsRes.ok) {
    const errBody = await ibsRes.text();
    console.error(`[IBS] Inline fallback failed [${ibsRes.status}]:`, errBody);
    await handleIbsFailure(supabaseAdmin, workId, userId, work.title, `iBS inline error ${ibsRes.status}: ${errBody}`, creditCost);
    return new Response(
      JSON.stringify({ success: false, error: `iBS registration failed: ${errBody}`, workId, status: "failed", refunded: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const ibsResult = await ibsRes.json();

  await supabaseAdmin.from("works").update({
    status: "processing",
    ibs_evidence_id: ibsResult.id,
    ibs_signature_id: signatureId,
    file_hash: fileHash,
    ibs_payload_checksum: ibsPayloadChecksum,
    ibs_payload_algorithm: ibsPayloadAlgorithm,
    updated_at: new Date().toISOString(),
  }).eq("id", workId);

  await supabaseAdmin.from("ibs_sync_queue").insert({
    work_id: workId,
    user_id: userId,
    ibs_evidence_id: ibsResult.id,
    status: "waiting",
  });

  console.log(`[IBS] Evidence created (inline fallback) for work ${workId}: ${ibsResult.id}`);

  return new Response(
    JSON.stringify({ success: true, workId, evidenceId: ibsResult.id, evidenceLink: ibsResult.link, status: "processing" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * Handles iBS failure: marks work as failed and refunds credit only if actually deducted.
 */
async function handleIbsFailure(
  supabaseAdmin: ReturnType<typeof createClient>,
  workId: string,
  userId: string,
  workTitle: string,
  reason: string,
  creditCost: number = 0
) {
  await supabaseAdmin
    .from("works")
    .update({ status: "failed", failure_reason: reason, updated_at: new Date().toISOString() })
    .eq("id", workId);

  if (creditCost > 0) {
    // Idempotency guard: avoid double refunds if this function is retried
    // or if the abandoned-drafts cron already issued one for this work.
    const { data: existingRefund } = await supabaseAdmin
      .from("credit_transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "refund")
      .ilike("description", `%${workId}%`)
      .maybeSingle();

    if (existingRefund) {
      console.log(`[IBS] Skipping refund for work ${workId} — refund already exists (${existingRefund.id}). Reason: ${reason}`);
      return;
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("available_credits")
      .eq("user_id", userId)
      .single();

    if (profile) {
      await supabaseAdmin
        .from("profiles")
        .update({
          available_credits: profile.available_credits + creditCost,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      await supabaseAdmin.from("credit_transactions").insert({
        user_id: userId,
        amount: creditCost,
        type: "refund",
        description: `Reembolso por fallo iBS: work ${workId} — ${workTitle} — ${reason}`,
      });

      console.log(`[IBS] FAILURE — Work ${workId} marked as failed, ${creditCost} credit(s) refunded. Reason: ${reason}`);
    }
  } else {
    console.log(`[IBS] FAILURE — Work ${workId} marked as failed, no credits to refund. Reason: ${reason}`);
  }
}

// Marca un work como failed solo si actualmente está en draft (idempotente).
// Usado en retornos tempranos (validación, créditos insuficientes, etc.).
async function markDraftAsFailed(
  supabaseAdmin: ReturnType<typeof createClient>,
  workId: string,
  reason: string,
) {
  if (!workId) return;
  try {
    const { error } = await supabaseAdmin
      .from("works")
      .update({ status: "failed", failure_reason: reason, updated_at: new Date().toISOString() })
      .eq("id", workId)
      .eq("status", "draft");
    if (error) console.error(`[markDraftAsFailed] ${workId}: ${error.message}`);
    else console.log(`[markDraftAsFailed] ${workId} -> failed (${reason})`);
  } catch (e) {
    console.error(`[markDraftAsFailed] exception:`, e);
  }
}
