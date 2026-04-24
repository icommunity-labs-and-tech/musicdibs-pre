import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";
import { kycInProcessEmail } from "../_shared/transactional-email.ts";

const IBS_API_URL = "https://api.icommunitylabs.com/v2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const toCheckerNetworkSlug = (network?: string) => {
  const normalized = (network || "polygon").toLowerCase();
  if (normalized === "fantom_opera_mainnet" || normalized === "fantom" || normalized === "opera") {
    return "opera";
  }
  return normalized;
};

const readString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
  }
  return undefined;
};

const jsonToText = (value: unknown) => {
  if (value == null) return undefined;
  if (typeof value === "string") return value.trim() || undefined;
  try {
    const serialized = JSON.stringify(value);
    return serialized === '{}' || serialized === '[]' ? undefined : serialized;
  } catch {
    return undefined;
  }
};

/**
 * Manages iCommunity signatures (identities) for users.
 * 
 * Actions:
 *   - create: Creates a new signature via KYC process → returns KYC URL
 *   - create_source: Creates a signature from identity sources
 *   - list: Lists user's signatures (from local DB)
 *   - get: Gets signature details from iBS API
 *   - sync: Syncs signature status from iBS API to local DB
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

    const body = await req.json();
    const { action } = body;

    const ibsHeaders = {
      "Authorization": `Bearer ${IBS_API_KEY}`,
      "Content-Type": "application/json",
    };

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── CREATE via KYC ───────────────────────────────────────
    if (action === "create") {
      const { signatureName } = body;
      if (!signatureName) {
        return new Response(JSON.stringify({ error: "signatureName is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ibsRes = await fetch(`${IBS_API_URL}/signatures`, {
        method: "POST",
        headers: ibsHeaders,
        body: JSON.stringify({ signature_name: signatureName }),
      });

      if (!ibsRes.ok) {
        const errBody = await ibsRes.text();
        return new Response(JSON.stringify({ error: `iBS error: ${errBody}` }), {
          status: ibsRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await ibsRes.json();

      // Save to local DB with status 'initiated' (signature created in iBS but documents NOT yet submitted by user)
      // The signature only progresses to 'pending' / kyc_status='pending' when iBS confirms documents received
      // via the signature.created webhook. This way, if the user abandons the flow before submitting docs,
      // their kyc_status stays 'unverified' and they can restart.
      await supabaseAdmin.from("ibs_signatures").insert({
        user_id: user.id,
        ibs_signature_id: result.signature_id,
        signature_name: signatureName,
        status: "initiated",
        kyc_url: result.url,
      });

      // DO NOT update profiles.kyc_status here. Keep it as 'unverified' until iBS webhook confirms
      // documents were received (signature.created event).
      // We only persist the ibs_signature_id so we can correlate the webhook later.
      await supabaseAdmin
        .from("profiles")
        .update({ ibs_signature_id: result.signature_id, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      console.log(`[IBS-SIGNATURES] Signature initiated for user ${user.id} (kyc_status remains unverified until docs received)`);

      // Note: kyc_in_process email is now sent from the ibs-webhook-signature-ok handler
      // when iBS confirms receipt of documents (signature.created event), to avoid
      // sending it prematurely if the user abandons before submitting documents.

      return new Response(JSON.stringify({
        signatureId: result.signature_id,
        kycUrl: result.url,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── MARK KYC STARTED ─────────────────────────────────────
    // Called by the frontend at the EXACT moment the user is redirected to the KYC URL.
    // Sets profiles.kyc_status='pending', marks the signature row as 'pending', and sends
    // the "verification in process" email. Idempotent: only fires the email/status change
    // when the user is currently 'unverified' or 'initiated'.
    if (action === "mark_kyc_started") {
      const { signatureId } = body;
      if (!signatureId) {
        return new Response(JSON.stringify({ error: "signatureId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify the signature belongs to this user
      const { data: sigRow } = await supabaseAdmin
        .from("ibs_signatures")
        .select("id, user_id, status")
        .eq("ibs_signature_id", signatureId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!sigRow) {
        return new Response(JSON.stringify({ error: "Signature not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("kyc_status, display_name, language")
        .eq("user_id", user.id)
        .single();

      const currentStatus = profile?.kyc_status || "unverified";
      const shouldNotify = currentStatus === "unverified" || currentStatus === "initiated";

      if (shouldNotify) {
        await supabaseAdmin
          .from("profiles")
          .update({
            kyc_status: "pending",
            ibs_signature_id: signatureId,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);

        await supabaseAdmin
          .from("ibs_signatures")
          .update({ status: "pending", updated_at: new Date().toISOString() })
          .eq("id", sigRow.id);

        const name = profile?.display_name || user.email?.split("@")[0] || "Usuario";
        const emailData = kycInProcessEmail({ name, lang: profile?.language || undefined });
        const messageId = crypto.randomUUID();
        const recipientEmail = user.email!;
        await supabaseAdmin.from("email_send_log").insert({
          message_id: messageId,
          template_name: "kyc_in_process",
          recipient_email: recipientEmail,
          status: "pending",
        });
        await supabaseAdmin.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            idempotency_key: `kyc_in_process-${messageId}`,
            message_id: messageId,
            to: recipientEmail,
            from: "MusicDibs <noreply@notify.musicdibs.com>",
            sender_domain: "notify.musicdibs.com",
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text,
            purpose: "transactional",
            label: "kyc_in_process",
            queued_at: new Date().toISOString(),
          },
        });
        console.log(`[IBS-SIGNATURES] mark_kyc_started: kyc_status -> pending, email enqueued for user ${user.id}`);
      } else {
        console.log(`[IBS-SIGNATURES] mark_kyc_started: skipped (kyc_status=${currentStatus}) for user ${user.id}`);
      }

      return new Response(JSON.stringify({ success: true, notified: shouldNotify }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── CREATE from identity sources ─────────────────────────
    if (action === "create_source") {
      const { signatureName, sources } = body;
      if (!signatureName || !sources?.length) {
        return new Response(JSON.stringify({ error: "signatureName and sources are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ibsRes = await fetch(`${IBS_API_URL}/signatures/identity`, {
        method: "POST",
        headers: ibsHeaders,
        body: JSON.stringify({ signature_name: signatureName, sources }),
      });

      if (!ibsRes.ok) {
        const errBody = await ibsRes.text();
        return new Response(JSON.stringify({ error: `iBS error: ${errBody}` }), {
          status: ibsRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await ibsRes.json();

      await supabaseAdmin.from("ibs_signatures").insert({
        user_id: user.id,
        ibs_signature_id: result.signature_id,
        signature_name: signatureName,
        status: "success",
      });

      return new Response(JSON.stringify({
        signatureId: result.signature_id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── LIST (from local DB) ─────────────────────────────────
    if (action === "list") {
      const { data: sigs, error } = await supabaseUser
        .from("ibs_signatures")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ signatures: sigs || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── GET (from iBS API) ───────────────────────────────────
    if (action === "get") {
      const { ibsSignatureId } = body;
      if (!ibsSignatureId) {
        return new Response(JSON.stringify({ error: "ibsSignatureId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ibsRes = await fetch(`${IBS_API_URL}/signatures/${ibsSignatureId}`, {
        headers: { "Authorization": `Bearer ${IBS_API_KEY}` },
      });

      if (!ibsRes.ok) {
        const errBody = await ibsRes.text();
        return new Response(JSON.stringify({ error: `iBS error: ${errBody}` }), {
          status: ibsRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await ibsRes.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── SYNC (update local status from iBS) ──────────────────
    if (action === "sync") {
      const { data: sigs } = await supabaseUser
        .from("ibs_signatures")
        .select("ibs_signature_id, status")
        .eq("user_id", user.id)
        .in("status", ["pending"]);

      if (sigs && sigs.length > 0) {
        for (const sig of sigs) {
          try {
            const ibsRes = await fetch(`${IBS_API_URL}/signatures/${sig.ibs_signature_id}`, {
              headers: { "Authorization": `Bearer ${IBS_API_KEY}` },
            });
            if (ibsRes.ok) {
              const ibsData = await ibsRes.json();
              if (ibsData.status && ibsData.status !== sig.status) {
                await supabaseAdmin
                  .from("ibs_signatures")
                  .update({ status: ibsData.status, updated_at: new Date().toISOString() })
                  .eq("ibs_signature_id", sig.ibs_signature_id);
              }
            }
          } catch (err) {
            console.warn(`[IBS-SIG] Failed to sync ${sig.ibs_signature_id}:`, err);
          }
        }
      }

      return new Response(JSON.stringify({ synced: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── POLL evidence status ─────────────────────────────────
    if (action === "poll_evidence") {
      const { evidenceId } = body;
      if (!evidenceId) {
        return new Response(JSON.stringify({ error: "evidenceId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ibsRes = await fetch(`${IBS_API_URL}/evidences/${evidenceId}`, {
        headers: { "Authorization": `Bearer ${IBS_API_KEY}` },
      });

      if (!ibsRes.ok) {
        const errBody = await ibsRes.text();
        return new Response(JSON.stringify({ error: `iBS error: ${errBody}` }), {
          status: ibsRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const evidence = await ibsRes.json();

      // If certified, update our work record
      if (evidence.status === "certified" || evidence.certification?.hash) {
        const certHash = evidence.certification?.hash;
        const network = evidence.certification?.network || "polygon";
        const checkerNetwork = toCheckerNetworkSlug(network);
        const checkerUrl = evidence.certification?.links?.checker ||
          (certHash ? `https://checker.icommunitylabs.com/check/${checkerNetwork}/${certHash}` : null);
        const integrityEntry = Array.isArray(evidence.payload?.integrity) ? evidence.payload.integrity[0] : null;
        const ibsPayloadChecksum = typeof integrityEntry?.checksum === "string" ? integrityEntry.checksum : null;
        const ibsPayloadAlgorithm = typeof integrityEntry?.algorithm === "string" ? integrityEntry.algorithm : null;

        const { data: work } = await supabaseAdmin
          .from("works")
          .select("id, status")
          .eq("ibs_evidence_id", evidenceId)
          .single();

        if (work && work.status === "processing") {
          const updates: Record<string, unknown> = {
            status: "registered",
            blockchain_hash: certHash,
            blockchain_network: network,
            checker_url: checkerUrl,
            certificate_url: checkerUrl,
            certified_at: evidence.certification?.timestamp || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          if (ibsPayloadChecksum) updates.ibs_payload_checksum = ibsPayloadChecksum;
          if (ibsPayloadAlgorithm) updates.ibs_payload_algorithm = ibsPayloadAlgorithm;

          await supabaseAdmin
            .from("works")
            .update(updates)
            .eq("id", work.id);
        }
      }

      const certification = evidence.certification || {};
      const payload = evidence.payload || {};
      const integrityEntry = Array.isArray(payload?.integrity) ? payload.integrity[0] : null;
      const fileEntry = Array.isArray(payload?.files) ? payload.files[0] : null;
      const metadata = payload?.metadata ?? evidence.metadata ?? null;
      const externalContent = payload?.external_content ?? payload?.externalContent ?? evidence.external_content ?? null;
      const network = readString(certification?.network, evidence?.network) || 'polygon';
      const txHash = readString(certification?.hash, evidence?.transaction_hash, evidence?.tx_hash);
      const checkerNetwork = toCheckerNetworkSlug(network);
      const checkerUrl = readString(
        certification?.links?.checker,
        evidence?.links?.checker,
        txHash ? `https://checker.icommunitylabs.com/check/${checkerNetwork}/${txHash}` : undefined,
      );
      const explorerUrl = txHash && checkerNetwork === 'opera'
        ? `https://explorer.fantom.network/tx/${txHash}`
        : undefined;

      return new Response(JSON.stringify({
        evidenceId: evidence.id,
        status: evidence.status,
        certification: evidence.certification || null,
        detail: {
          title: readString(payload?.title, evidence?.title),
          description: readString(payload?.description, evidence?.description),
          fileName: readString(fileEntry?.name, fileEntry?.filename),
          fileSize: fileEntry?.size ?? fileEntry?.file_size ?? null,
          metadata: jsonToText(metadata),
          externalContent: jsonToText(externalContent),
          txHash,
          network,
          certifiedAt: readString(certification?.timestamp, evidence?.created_at),
          checkerUrl,
          ibsUrl: readString(evidence?.link, `https://app.icommunitylabs.com/evidences/${evidence.id}`),
          explorerUrl,
          blockNumber: readString(certification?.block_number, certification?.blockNumber, evidence?.block_number),
          blockHash: readString(certification?.block_hash, certification?.blockHash, evidence?.block_hash),
          contractAddress: readString(certification?.contract, certification?.contract_address, certification?.contractAddress, evidence?.contract),
          fingerprint: readString(
            integrityEntry?.checksum,
            integrityEntry?.code,
            payload?.checksum,
            evidence?.checksum,
          ),
          algorithm: readString(
            integrityEntry?.algorithm,
            integrityEntry?.algo,
            payload?.algorithm,
            evidence?.algorithm,
          ),
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("[IBS-SIGNATURES] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
