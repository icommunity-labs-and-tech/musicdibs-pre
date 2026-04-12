import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    if (!workId || typeof workId !== "string") {
      return new Response(JSON.stringify({ error: "workId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!signatureId || typeof signatureId !== "string") {
      return new Response(JSON.stringify({ error: "signatureId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify the work belongs to the user and is in 'processing' state
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

    if (work.status !== "draft" && work.status !== "processing") {
      return new Response(
        JSON.stringify({ error: "Work is not in draft/processing state", status: work.status }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Always use presigned upload flow to avoid memory issues
    console.log(`[IBS] Using presigned upload for work ${workId} (${fileSizeMB.toFixed(1)}MB), ${allFilePaths.length} file(s)`);

    // Build files metadata for upload session
    const filesMetadata = [];
    for (const fp of allFilePaths) {
      const name = (fp.split("/").pop() || "file").replace(/^\d+_/, "");
      // Get size via HEAD request on signed URL
      const { data: fpUrl } = await supabaseAdmin.storage.from("works-files").createSignedUrl(fp, 600);
      let fSize = fileSize; // default to primary file size
      let fType = contentType;
      if (fp !== work.file_path && fpUrl?.signedUrl) {
        const h = await fetch(fpUrl.signedUrl, { method: "HEAD" });
        fSize = parseInt(h.headers.get("content-length") || "0", 10);
        fType = h.headers.get("content-type") || "application/octet-stream";
      }
      filesMetadata.push({ name, content_type: fType, size: fSize, _signedUrl: fpUrl?.signedUrl || signedUrlData.signedUrl });
    }

    // Step 1: Create upload session with iBS
    const uploadBody = {
      title: work.title,
      ...(work.description ? { description: work.description } : {}),
      signatures: [{ id: signatureId }],
      files: filesMetadata.map(f => ({ name: f.name, content_type: f.content_type, size: f.size })),
    };

    const uploadRes = await fetch(`${IBS_API_URL}/evidences/uploads`, {
      method: "POST",
      headers: ibsHeaders,
      body: JSON.stringify(uploadBody),
    });

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text();
      console.error(`[IBS] Upload session creation failed [${uploadRes.status}]:`, errBody);

      // Fallback: try inline upload for small files only (< 5MB)
      if (fileSizeMB <= 5 && allFilePaths.length === 1) {
        console.log(`[IBS] Trying inline fallback for small file`);
        return await handleInlineUpload(supabaseAdmin, work, signedUrlData.signedUrl, signatureId, ibsHeaders, workId, userId, fileHash, ibsPayloadChecksum, ibsPayloadAlgorithm, corsHeaders);
      }

      await handleIbsFailure(supabaseAdmin, workId, userId, work.title, `iBS upload error ${uploadRes.status}: ${errBody}`);
      return new Response(
        JSON.stringify({ success: false, error: `iBS upload session failed: ${errBody}`, workId, status: "failed", refunded: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uploadSession = await uploadRes.json();
    const sessionFiles = uploadSession.files || [];

    // Step 2: Stream each file from Supabase storage to iBS presigned URL
    for (let i = 0; i < sessionFiles.length; i++) {
      const fileUploadInfo = sessionFiles[i];
      if (!fileUploadInfo?.upload?.url) {
        console.warn(`[IBS] No upload URL for file index ${i}, skipping`);
        continue;
      }

      // Stream file from storage directly to iBS without buffering in memory
      const sourceUrl = filesMetadata[i]._signedUrl;
      const sourceRes = await fetch(sourceUrl);
      if (!sourceRes.ok || !sourceRes.body) {
        console.error(`[IBS] Failed to fetch file ${i} from storage`);
        continue;
      }

      const presignedHeaders: Record<string, string> = {};
      if (fileUploadInfo.upload.headers) {
        Object.assign(presignedHeaders, fileUploadInfo.upload.headers);
      }
      // Set content length for the upload
      presignedHeaders["content-length"] = String(filesMetadata[i].size);

      const putRes = await fetch(fileUploadInfo.upload.url, {
        method: fileUploadInfo.upload.method || "PUT",
        headers: presignedHeaders,
        body: sourceRes.body, // Stream directly
      });

      if (!putRes.ok) {
        const errBody = await putRes.text();
        console.error(`[IBS] Presigned upload failed for file ${i} [${putRes.status}]:`, errBody);
        await handleIbsFailure(supabaseAdmin, workId, userId, work.title, `File upload failed: ${putRes.status}`);
        return new Response(
          JSON.stringify({ success: false, error: "File upload to storage failed", workId, status: "failed", refunded: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Consume response body
      await putRes.text();
    }

    // Step 3: Confirm upload
    const completeUrl = uploadSession.complete?.url || `${IBS_API_URL}/evidences/uploads/${uploadSession.id}/complete`;
    const completeRes = await fetch(completeUrl, {
      method: "POST",
      headers: { "Authorization": `Bearer ${IBS_API_KEY}` },
    });

    if (!completeRes.ok) {
      const errBody = await completeRes.text();
      console.error(`[IBS] Upload confirmation failed [${completeRes.status}]:`, errBody);
      await handleIbsFailure(supabaseAdmin, workId, userId, work.title, `Upload confirmation failed: ${completeRes.status}`);
      return new Response(
        JSON.stringify({ success: false, error: "Upload confirmation failed", workId, status: "failed", refunded: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const completeResult = await completeRes.json();
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
    console.error("[IBS-REGISTER] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
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
) {
  const { encode: base64Encode } = await import("https://deno.land/std@0.168.0/encoding/base64.ts");

  const fileRes = await fetch(signedUrl);
  const fileBuffer = await fileRes.arrayBuffer();
  const fileBase64 = base64Encode(new Uint8Array(fileBuffer));
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
    await handleIbsFailure(supabaseAdmin, workId, userId, work.title, `iBS inline error ${ibsRes.status}: ${errBody}`);
    return new Response(
      JSON.stringify({ success: false, error: `iBS registration failed: ${errBody}`, workId, status: "failed", refunded: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const ibsResult = await ibsRes.json();

  await supabaseAdmin.from("works").update({
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
 * Handles iBS failure: marks work as failed and refunds credit.
 */
async function handleIbsFailure(
  supabaseAdmin: ReturnType<typeof createClient>,
  workId: string,
  userId: string,
  workTitle: string,
  reason: string
) {
  await supabaseAdmin
    .from("works")
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("id", workId);

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("available_credits")
    .eq("user_id", userId)
    .single();

  if (profile) {
    await supabaseAdmin
      .from("profiles")
      .update({
        available_credits: profile.available_credits + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    await supabaseAdmin.from("credit_transactions").insert({
      user_id: userId,
      amount: 1,
      type: "refund",
      description: `Reembolso por fallo iBS: ${workTitle} — ${reason}`,
    });
  }

  console.log(`[IBS] FAILURE — Work ${workId} marked as failed, credit refunded. Reason: ${reason}`);
}
