/**
 * ⚠️  DO NOT MODIFY THIS FILE  ⚠️
 *
 * register-work-ibs usa el flujo presigned GCS de 3 pasos (iBS API v2).
 * Cualquier cambio a base64 (incluso "streaming") causa OOM en el worker
 * Deno con archivos >25MB y rompe el registro de obras para todos los usuarios.
 *
 * Flujo actual (v225) — DUAL A/B según tamaño:
 *   < 15 MB → A: POST /v2/evidences (directo, más simple y rápido)
 *   ≥ 15 MB → B: presigned GCS 3 pasos (sin límite de tamaño)
 *     PASO 1 → POST /v2/evidences/uploads      (sesión + URLs presignadas GCS)
 *     PASO 2 → PUT  <url_gcs>                  (stream directo, SIN base64)
 *     PASO 3 → POST /v2/evidences/uploads/{id}/complete
 *
 * Límite soportado: hasta 5 GiB por archivo (vía flujo B).
 * Para cualquier cambio en esta función, consultar primero con el equipo técnico.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const IBS_API_URL = "https://api.icommunitylabs.com/v2";

// Timeout para llamadas a IBS — Supabase corta la edge function a los ~60s (free) / 150s (pro)
// sin dejar ejecutar el catch global. Con timeout explícito capturamos el error correctamente.
const IBS_TIMEOUT_MS = 45_000; // 45s por llamada individual a IBS
const GCS_TIMEOUT_MS = 55_000; // 55s para upload a GCS (archivos grandes)

async function fetchWithTimeout(url: string, opts: RequestInit & { duplex?: string } = {}, timeoutMs = IBS_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Generic timeout wrapper para cualquier promise (RPC de supabase-js, storage SDK, etc.)
// que no acepte AbortSignal directamente. Usado para evitar cuelgues silenciosos
// en llamadas de red del SDK que no son fetch() directo.
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: number;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout: ${label}`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

// SIEMPRE usamos presigned GCS streaming (ruta B) para evitar OOM en el worker.
// La ruta A (base64 en RAM) causa WORKER_RESOURCE_LIMIT incluso con archivos pequeños.
const DIRECT_UPLOAD_THRESHOLD_BYTES = 0;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GLOBAL_TIMEOUT_MS = 50_000; // limite absoluto de la funcion completa

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
    deductedFromPermanent: number;
  } = {
    supabaseAdmin: null,
    workId: null,
    userId: null,
    workTitle: "",
    creditCost: 0,
    deducted: false,
    deductedFromPermanent: 0,
  };

  // Timeout global: si CUALQUIER punto del proceso se cuelga silenciosamente
  // (llamadas del SDK de supabase-js sin AbortSignal, problemas de red no
  // capturados por los timeouts puntuales, etc.), este limite absoluto
  // garantiza que el usuario nunca se quede bloqueado en 'processing' para
  // siempre. Ver incidente 2026-07-09 (Mario testing jueves 1-7).
  let globalTimedOut = false;
  const globalTimeoutPromise = new Promise<Response>((resolve) => {
    setTimeout(() => {
      globalTimedOut = true;
      resolve(new Response(
        JSON.stringify({ error: "global_timeout", workId: ctx.workId, status: "failed" }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      ));
    }, GLOBAL_TIMEOUT_MS);
  });

  const corePromise = (async (): Promise<Response> => {
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

    // ── Pre-check: verificar que la firma esté REALMENTE verificada en iBS ──
    // Evita consumir crédito + reintentos si la firma no está KYC-completa
    // (iBS devuelve 500 en /evidences si el signer no está verificado).
    {
      const { data: sigRow } = await supabaseAdmin
        .from("ibs_signatures")
        .select("status")
        .eq("ibs_signature_id", signatureId)
        .eq("user_id", user.id)
        .maybeSingle();

      let sigStatus = sigRow?.status as string | undefined;

      // Si no está 'success' en BD, refrescamos contra iBS antes de rechazar
      if (sigStatus !== "success") {
        try {
          const ibsCheck = await fetchWithTimeout(`${IBS_API_URL}/signatures/${signatureId}`, {
            headers: { Authorization: `Bearer ${IBS_API_KEY}` },
          }, IBS_TIMEOUT_MS);
          if (ibsCheck.ok) {
            const ibsData = await ibsCheck.json();
            const realStatus = ibsData?.status as string | undefined;
            if (realStatus && realStatus !== sigStatus) {
              await supabaseAdmin
                .from("ibs_signatures")
                .update({ status: realStatus, updated_at: new Date().toISOString() })
                .eq("ibs_signature_id", signatureId);
              sigStatus = realStatus;
            }
            // Si iBS la marca como verificada, sincronizamos también el perfil
            if (realStatus === "success") {
              await supabaseAdmin
                .from("profiles")
                .update({ kyc_status: "verified", ibs_signature_id: signatureId, updated_at: new Date().toISOString() })
                .eq("user_id", user.id);
            }
          }
        } catch (err) {
          console.warn(`[IBS] pre-check signature fetch failed:`, err);
        }
      }

      if (sigStatus !== "success") {
        console.log(`[IBS] Pre-check rejected: signature ${signatureId} status='${sigStatus}' (no verificada)`);
        // No tocamos el work — sigue en draft, sin descontar crédito
        return new Response(
          JSON.stringify({
            success: false,
            error: "Esta firma no está verificada. Completa el KYC pendiente o crea una nueva firma para poder registrar obras.",
            code: "signature_not_verified",
            signatureStatus: sigStatus || "unknown",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { data: work, error: workError } = await supabaseAdmin
      .from("works")
      .select("id, user_id, title, description, status, file_path, file_hash, file_hash_sha512_b64, creators, type, author")
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
      .from("profiles").select("available_credits, subscription_plan")
      .eq("user_id", user.id).single();

    if (!profile || profile.available_credits < creditCost) {
      await markDraftAsFailed(supabaseAdmin, workId, "insufficient_credits");
      return new Response(
        JSON.stringify({ error: "Créditos insuficientes", available: profile?.available_credits || 0, required: creditCost }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    // ── Free tier: máximo 1 registro de obra por cuenta gratuita ──
    if (profile && profile.subscription_plan === "Free") {
      const { count } = await supabaseAdmin
        .from("works")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("status", ["registered", "processing", "certified"]);
      if ((count ?? 0) >= 1) {
        await markDraftAsFailed(supabaseAdmin, workId, "free_register_limit");
        return new Response(
          JSON.stringify({
            error: "Los usuarios gratuitos solo pueden registrar 1 obra. Actualiza tu plan para registrar mas.",
            code: "FREE_REGISTER_LIMIT",
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    let deductResult: any = null;
    let deductRpcError: any = null;
    try {
      const rpcRes = await withTimeout(
        supabaseAdmin.rpc("deduct_credits_ordered", {
          p_user_id: user.id,
          p_amount: creditCost,
          p_feature: "register_work",
          p_description: `Registro: ${work.title}`,
        }),
        15_000,
        "deduct_credits_ordered"
      );
      deductResult = rpcRes.data;
      deductRpcError = rpcRes.error;
    } catch (rpcTimeoutErr) {
      console.error(`[IBS] deduct_credits_ordered timeout for work ${workId}:`, rpcTimeoutErr);
      await supabaseAdmin.from("works").update({
        status: "failed", failure_reason: "credit_deduction_timeout", updated_at: new Date().toISOString(),
      }).eq("id", workId);
      return new Response(
        JSON.stringify({ error: "Timeout procesando creditos, intenta de nuevo", workId, status: "failed" }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (deductRpcError || !deductResult?.success) {
      return new Response(
        JSON.stringify({ error: "Créditos insuficientes", available: deductResult?.available ?? profile.available_credits, required: creditCost }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    ctx.deducted = true;
    ctx.deductedFromPermanent = deductResult.from_permanent ?? 0;
    console.log(`[IBS] Credit deducted for work ${workId}: ${creditCost} (from_permanent=${ctx.deductedFromPermanent})`);

    // ── Metadatos de archivos (HEAD, sin descargar) ───────────────────
    const allFilePaths: string[] = [work.file_path, ...(Array.isArray(additionalFilePaths) ? additionalFilePaths : [])];

    const filesMeta: Array<{ path: string; name: string; size: number; contentType: string; signedUrl: string }> = [];

    for (const fp of allFilePaths) {
      let urlData: { signedUrl: string } | null = null;
      try {
        const signedUrlPromise = supabaseAdmin.storage.from("works-files").createSignedUrl(fp, 1800);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("createSignedUrl timeout")), 10_000)
        );
        const result = await Promise.race([signedUrlPromise, timeoutPromise]) as any;
        urlData = result?.data ?? null;
      } catch (signedUrlErr) {
        console.warn(`[IBS] createSignedUrl timeout/error for ${fp}:`, signedUrlErr);
        continue;
      }
      if (!urlData?.signedUrl) { console.warn(`[IBS] No signed URL for ${fp}`); continue; }
      let head: Response;
      try {
        head = await fetchWithTimeout(urlData.signedUrl, { method: "HEAD" }, 10_000);
      } catch (headErr) {
        console.warn(`[IBS] HEAD request timeout/error for ${fp}:`, headErr);
        continue;
      }
      const size = parseInt(head.headers.get("content-length") || "0", 10);
      const ct = head.headers.get("content-type") || "application/octet-stream";
      if (!size) { console.warn(`[IBS] File ${fp} has size=0, skipping`); continue; }
      const name = (fp.split("/").pop() || "file").replace(/^\d+_/, "");
      filesMeta.push({ path: fp, name, size, contentType: ct, signedUrl: urlData.signedUrl });
      console.log(`[IBS] File: ${name} | ${(size/1024/1024).toFixed(1)}MB | ${ct}`);
    }

    if (filesMeta.length === 0) {
      await handleIbsFailure(supabaseAdmin, workId, user.id, work.title, "No valid files", creditCost, ctx.deductedFromPermanent);
      ctx.deducted = false;
      return new Response(
        JSON.stringify({ success: false, error: "No valid files", workId, status: "failed", refunded: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ibsHeaders = { "Authorization": `Bearer ${IBS_API_KEY}`, "Content-Type": "application/json" };

    // ── Descripción enriquecida con metadatos de la obra (autor, tipo, coautores) ──
    const roleLabelMap: Record<string, string> = {
      autor: "Autor", compositor: "Compositor", cantante: "Cantante",
      productor: "Productor", arreglista: "Arreglista", adaptador: "Adaptador",
    };
    const rawCreators = Array.isArray((work as any).creators) ? (work as any).creators : [];
    const creatorsList = rawCreators
      .filter((c: any) => c && typeof c.name === "string" && c.name.trim())
      .map((c: any) => {
        const roles = Array.isArray(c.roles) && c.roles.length > 0
          ? c.roles.map((r: string) => roleLabelMap[r] || r).join(", ")
          : "Autor";
        const pct = typeof c.percentage === "number" ? ` — ${c.percentage}%` : "";
        return `- ${c.name.trim()} (${roles})${pct}`;
      });

    const metaLines: string[] = [];
    if (work.description && work.description.trim()) metaLines.push(work.description.trim());
    const detailLines: string[] = [];
    if ((work as any).author) detailLines.push(`Autor principal: ${(work as any).author}`);
    if ((work as any).type) detailLines.push(`Tipo de obra: ${(work as any).type}`);
    if (detailLines.length > 0) metaLines.push(detailLines.join("\n"));
    if (creatorsList.length > 0) {
      metaLines.push("Coautores y participación:\n" + creatorsList.join("\n"));
    }
    const enrichedDescription = metaLines.join("\n\n");

    // ── Decidir ruta A o B según tamaño total ─────────────────────────
    const totalSize = filesMeta.reduce((s, f) => s + f.size, 0);
    const useDirectUpload = totalSize < DIRECT_UPLOAD_THRESHOLD_BYTES;
    console.log(`[IBS] Total size: ${(totalSize/1024/1024).toFixed(1)}MB → usando ${useDirectUpload ? "A (directo)" : "B (presigned GCS)"}`);

    let evidenceId: string;
    let evidenceLink: string | undefined;

    if (useDirectUpload) {
      // ── RUTA A: POST /v2/evidences (directo, para archivos < 15MB) ──
      console.log(`[IBS] RUTA A — POST /v2/evidences directo`);

      const { encode: base64Encode } = await import("https://deno.land/std@0.168.0/encoding/base64.ts");

      const inlineFiles: Array<{ name: string; file: string }> = [];
      for (const fm of filesMeta) {
        let fileRes: Response;
        try {
          fileRes = await fetchWithTimeout(fm.signedUrl, {}, 30_000);
        } catch (fetchErr) {
          console.warn(`[IBS] Timeout/error downloading ${fm.name}:`, fetchErr);
          continue;
        }
        if (!fileRes.ok) { console.warn(`[IBS] Failed to fetch ${fm.name}: ${fileRes.status}`); continue; }
        const buf = await fileRes.arrayBuffer();
        inlineFiles.push({ name: fm.name, file: base64Encode(new Uint8Array(buf) as any) });
        console.log(`[IBS] Encoded ${fm.name} (${(buf.byteLength/1024/1024).toFixed(1)}MB)`);
      }

      if (inlineFiles.length === 0) {
        await handleIbsFailure(supabaseAdmin, workId, user.id, work.title, "No files encoded", creditCost, ctx.deductedFromPermanent);
        ctx.deducted = false;
        return new Response(
          JSON.stringify({ success: false, error: "No files encoded", workId, status: "failed", refunded: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const ibsPayload: Record<string, unknown> = { title: work.title, files: inlineFiles };
      if (enrichedDescription) ibsPayload.description = enrichedDescription;

      const ibsRes = await fetchWithTimeout(`${IBS_API_URL}/evidences`, {
        method: "POST", headers: ibsHeaders,
        body: JSON.stringify({ payload: ibsPayload, signatures: [{ id: signatureId }] }),
      }, IBS_TIMEOUT_MS);

      if (!ibsRes.ok) {
        const errBody = await ibsRes.text();
        console.error(`[IBS] Ruta A fallida [${ibsRes.status}]:`, errBody);
        await handleIbsFailure(supabaseAdmin, workId, user.id, work.title, `iBS direct error ${ibsRes.status}: ${errBody.slice(0, 200)}`, creditCost, ctx.deductedFromPermanent);
        ctx.deducted = false;
        return new Response(
          JSON.stringify({ success: false, error: "iBS direct upload failed", workId, status: "failed", refunded: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await ibsRes.json();
      evidenceId = result.id;
      evidenceLink = result.link;
      console.log(`[IBS] Ruta A OK — evidence: ${evidenceId}`);

    } else {
      // ── RUTA B: Presigned GCS 3 pasos (para archivos >= 15MB) ────────

      // PASO 1: Crear sesión
      const sessionBody = {
        title: work.title,
        ...(enrichedDescription ? { description: enrichedDescription } : {}),
        signatures: [{ id: signatureId }],
        files: filesMeta.map(f => ({ name: f.name, content_type: f.contentType, size: f.size })),
      };

      console.log(`[IBS] PASO 1 — Sesión upload para work ${workId}, ${filesMeta.length} archivo(s)`);
      const sessionRes = await fetchWithTimeout(`${IBS_API_URL}/evidences/uploads`, {
        method: "POST", headers: ibsHeaders, body: JSON.stringify(sessionBody),
      }, IBS_TIMEOUT_MS);

      if (!sessionRes.ok) {
        const errBody = await sessionRes.text();
        console.error(`[IBS] Sesión fallida [${sessionRes.status}]:`, errBody);
        await handleIbsFailure(supabaseAdmin, workId, user.id, work.title, `iBS session error ${sessionRes.status}: ${errBody.slice(0, 200)}`, creditCost, ctx.deductedFromPermanent);
        ctx.deducted = false;
        return new Response(
          JSON.stringify({ success: false, error: "iBS session failed", workId, status: "failed", refunded: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const session = await sessionRes.json();
      const sessionId = session.id;
      console.log(`[IBS] Sesión creada: ${sessionId}, expira: ${session.expires_at}`);

      // PASO 2: Subir a GCS (streaming, sin base64)
      for (let i = 0; i < filesMeta.length; i++) {
        const fileMeta = filesMeta[i];
        const uploadInfo = session.files[i]?.upload;

        if (!uploadInfo?.url) {
          await handleIbsFailure(supabaseAdmin, workId, user.id, work.title, `No upload URL for ${fileMeta.name}`, creditCost, ctx.deductedFromPermanent);
          ctx.deducted = false;
          return new Response(
            JSON.stringify({ success: false, error: "No upload URL", workId, status: "failed", refunded: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[IBS] PASO 2 — Subiendo ${fileMeta.name} (${(fileMeta.size/1024/1024).toFixed(1)}MB) a GCS...`);

        const fileRes = await fetchWithTimeout(fileMeta.signedUrl, {}, GCS_TIMEOUT_MS);
        if (!fileRes.ok || !fileRes.body) {
          await handleIbsFailure(supabaseAdmin, workId, user.id, work.title, `Download failed for ${fileMeta.name}`, creditCost, ctx.deductedFromPermanent);
          ctx.deducted = false;
          return new Response(
            JSON.stringify({ success: false, error: "File download failed", workId, status: "failed", refunded: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const gcsRes = await fetchWithTimeout(uploadInfo.url, {
          method: "PUT",
          headers: {
            "Content-Type": uploadInfo.headers?.["Content-Type"] || fileMeta.contentType,
            "Content-Length": String(fileMeta.size),
          },
          body: fileRes.body,
          // @ts-ignore Deno soporta duplex streaming
          duplex: "half",
        }, GCS_TIMEOUT_MS);

        if (!gcsRes.ok) {
          const gcsErr = await gcsRes.text();
          console.error(`[IBS] GCS upload fallido [${gcsRes.status}]:`, gcsErr.slice(0, 200));
          await handleIbsFailure(supabaseAdmin, workId, user.id, work.title, `GCS upload error ${gcsRes.status}`, creditCost, ctx.deductedFromPermanent);
          ctx.deducted = false;
          return new Response(
            JSON.stringify({ success: false, error: "GCS upload failed", workId, status: "failed", refunded: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[IBS] ${fileMeta.name} subido a GCS ✅ (${gcsRes.status})`);
      }

      // PASO 3: Confirmar evidencia en iBS (síncrono)
      // GUARDIA ANTI-DUPLICADO: si el work ya tiene un evidence_id distinto, no reprocesar
      const { data: freshWork } = await supabaseAdmin
        .from("works").select("ibs_evidence_id").eq("id", workId).single();
      if (freshWork?.ibs_evidence_id && freshWork.ibs_evidence_id !== sessionId) {
        console.log(`[IBS] PASO 3 skipped — work ${workId} ya tiene evidence ${freshWork.ibs_evidence_id}`);
        return new Response(
          JSON.stringify({ success: true, workId, status: "already_registered",
                           evidenceId: freshWork.ibs_evidence_id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[IBS] PASO 3 síncrono — llamando /complete para sesión ${sessionId}`);
      let completeRes!: Response;
      let attempt = 0;
      while (attempt < 3) {
        completeRes = await fetchWithTimeout(
          `${IBS_API_URL}/evidences/uploads/${sessionId}/complete`,
          { method: "POST", headers: ibsHeaders, body: JSON.stringify({}) },
          IBS_TIMEOUT_MS
        );
        if (completeRes.ok) break;
        attempt++;
        if (attempt < 3) await new Promise((r) => setTimeout(r, 1000 * attempt));
        console.warn(`[IBS] PASO 3 intento ${attempt} fallido [${completeRes.status}]`);
      }

      if (!completeRes.ok) {
        const errText = await completeRes.text().catch(() => "unknown");
        console.error(`[IBS] PASO 3 fallido [${completeRes.status}]: ${errText.slice(0, 300)}`);
        await handleIbsFailure(supabaseAdmin, workId, user.id, work.title,
          `complete error ${completeRes.status}`, creditCost, ctx.deductedFromPermanent);
        ctx.deducted = false;
        return new Response(
          JSON.stringify({ success: false, error: "IBS complete failed", workId, status: "failed", refunded: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const completeResult = await completeRes.json();
      const finalEvidenceId = completeResult.id;
      console.log(`[IBS] PASO 3 OK — evidenceId: ${finalEvidenceId}`);

      await supabaseAdmin.from("works").update({
        ibs_evidence_id: finalEvidenceId,
        ibs_signature_id: signatureId,
        file_hash: work.file_hash || "",
        ibs_payload_checksum: work.file_hash_sha512_b64 || "",
        ibs_payload_algorithm: "SHA-512",
        updated_at: new Date().toISOString(),
      }).eq("id", workId);

      // Insertar en ibs_sync_queue con status "waiting" para el polling de certificación
      await supabaseAdmin.from("ibs_sync_queue").insert({
        work_id: workId,
        user_id: user.id,
        ibs_evidence_id: finalEvidenceId,
        status: "waiting",
      });

      console.log(`[IBS] Work ${workId} → evidence ${finalEvidenceId} registrado síncronamente ✅`);

      return new Response(
        JSON.stringify({ success: true, workId, status: "processing", evidenceId: finalEvidenceId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── RUTA A: Actualizar work con evidence final ────────────────────
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
    const isTimeout = e?.name === "AbortError" || e?.message?.includes("AbortError");
    const errMsg = isTimeout ? "timeout_calling_ibs" : (e?.message?.slice(0, 200) || "unknown");
    console.error(`[IBS-REGISTER] ${isTimeout ? "TIMEOUT" : "Unhandled error"}:`, e?.message || e);

    // Marcar el work como failed aunque no hayamos deducido crédito
    // (el cron lo haría igual a los 30min, pero así queda el motivo real registrado)
    if (ctx.supabaseAdmin && ctx.workId) {
      try {
        await ctx.supabaseAdmin.from("works")
          .update({ status: "failed", failure_reason: errMsg, updated_at: new Date().toISOString() })
          .eq("id", ctx.workId)
          .in("status", ["processing", "draft"]);
      } catch { /* ignore */ }
    }

    if (ctx.deducted && ctx.supabaseAdmin && ctx.workId && ctx.userId && ctx.creditCost > 0) {
      try {
        await handleIbsFailure(
          ctx.supabaseAdmin, ctx.workId, ctx.userId, ctx.workTitle,
          `crash: ${e?.message?.slice(0, 200) || "unknown"}`, ctx.creditCost, ctx.deductedFromPermanent
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
  })();

  const result = await Promise.race([corePromise, globalTimeoutPromise]);

  if (globalTimedOut) {
    console.error(`[IBS-REGISTER] GLOBAL TIMEOUT after ${GLOBAL_TIMEOUT_MS}ms for work ${ctx.workId} — marking failed + refund`);
    if (ctx.supabaseAdmin && ctx.workId) {
      try {
        await ctx.supabaseAdmin.from("works")
          .update({ status: "failed", failure_reason: "global_timeout", updated_at: new Date().toISOString() })
          .eq("id", ctx.workId)
          .in("status", ["processing", "draft"]);
      } catch (cleanupErr) {
        console.error("[IBS-REGISTER] global timeout cleanup (works update) failed:", cleanupErr);
      }
      if (ctx.deducted && ctx.userId && ctx.creditCost > 0) {
        try {
          await handleIbsFailure(
            ctx.supabaseAdmin, ctx.workId, ctx.userId, ctx.workTitle,
            "global_timeout", ctx.creditCost, ctx.deductedFromPermanent
          );
        } catch (refundErr) {
          console.error("[IBS-REGISTER] global timeout refund failed:", refundErr);
        }
      }
    }
  }

  return result;
});

async function handleIbsFailure(
  supabaseAdmin: ReturnType<typeof createClient>,
  workId: string, userId: string, workTitle: string, reason: string, creditCost = 0, fromPermanent = 0
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
    const { error: refundError } = await supabaseAdmin.rpc("refund_credits_ordered", {
      p_user_id: userId,
      p_amount: creditCost,
      p_from_permanent: fromPermanent,
      p_reason: `Reembolso por fallo iBS [${workId}]: ${workTitle} — ${reason.slice(0, 80)}`,
    });
    if (refundError) {
      console.error(`[IBS] Refund RPC error:`, refundError.message);
    } else {
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
