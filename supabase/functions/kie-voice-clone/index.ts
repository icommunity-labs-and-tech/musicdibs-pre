// Clonación de voz vía KIE Suno Voice API — flujo multi-paso con
// verificación anti-fraude (el usuario debe leer una frase generada
// dinámicamente antes de poder clonar su voz).
//
// Reemplaza el intento anterior con ElevenLabs (aparcado por inestabilidad).
// Reutiliza la tabla voice_clones (provider/provider_voice_id genéricos)
// añadiendo campos para trackear el estado intermedio del proceso.
//
// action = "request_phrase":
//   Paso 1. Recibe la URL de una muestra de voz del usuario (ya subida a
//   voice-samples) + el segmento relevante. Llama a
//   POST /api/v1/voice/validate. Crea la fila voice_clones en estado
//   'pending_phrase'. NO cuesta créditos (es solo preparación).
//
// action = "submit_verification":
//   Paso 2. El usuario ya leyó la frase de verificación y subió la
//   grabación. Llama a POST /api/v1/voice/generate con el taskId + la URL
//   de esa grabación + nombre/estilo. Aquí sí se cobra el coste de
//   clonación (operation_key: clone_voice). Pasa a estado 'generating'.
//
// action = "check_status":
//   Consulta manual del estado actual (fallback si el callback no llega),
//   vía GET record-info / validate-info según la fase.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-idempotency-key",
};

const KIE_BASE = "https://api.kie.ai/api/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const KIE_API_KEY = Deno.env.get("KIE_API_KEY");
    if (!KIE_API_KEY) return json({ error: "KIE_API_KEY not configured" }, 500);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    // ── request_phrase ──────────────────────────────────────────────────
    if (action === "request_phrase") {
      const { voiceUrl, vocalStartS, vocalEndS, language, name, description } = body || {};
      if (!voiceUrl || typeof voiceUrl !== "string") {
        return json({ error: "voiceUrl_required" }, 400);
      }
      // KIE Suno Voice solo acepta MP3 / WAV / M4A.
      const sampleExt = (voiceUrl.split("?")[0].split(".").pop() || "").toLowerCase();
      if (!["mp3", "wav", "m4a"].includes(sampleExt)) {
        return json({
          error: "unsupported_audio_format",
          message: "Formato de audio no compatible. Usa MP3, WAV o M4A (máx. 25 MB).",
        }, 400);
      }

      if (!name || typeof name !== "string" || !name.trim()) {
        return json({ error: "name_required" }, 400);
      }

      // Caduca clonaciones colgadas (>30 min) para no bloquear al usuario.
      const staleCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      await admin
        .from("voice_clones")
        .update({ status: "failed", error_message: "timeout" })
        .eq("user_id", user.id)
        .in("status", ["pending_phrase", "awaiting_verification_recording", "generating"])
        .lt("created_at", staleCutoff);

      // Límite razonable: 1 clonación en curso a la vez por usuario.
      const { data: inFlight } = await admin
        .from("voice_clones")
        .select("id")
        .eq("user_id", user.id)
        .in("status", ["pending_phrase", "awaiting_verification_recording", "generating"])
        .limit(1)
        .maybeSingle();
      if (inFlight) {
        return json({ error: "clone_in_progress", message: "Ya tienes una clonación de voz en curso." }, 409);
      }


      // provider_voice_id tiene una restricción UNIQUE junto a user_id.
      // No podemos usar "" como marcador para todas las solicitudes pendientes,
      // porque el segundo intento del usuario colisionaría antes de llamar a KIE.
      const cloneId = crypto.randomUUID();
      const pendingProviderVoiceId = `pending_${cloneId}`;
      const { data: row, error: insErr } = await admin
        .from("voice_clones")
        .insert({
          id: cloneId,
          user_id: user.id,
          provider: "kie",
          provider_voice_id: pendingProviderVoiceId,
          name: name.trim(),
          description: description || null,
          sample_url: voiceUrl,
          status: "pending_phrase",
        })
        .select("id")
        .single();
      if (insErr || !row) return json({ error: "db_insert_failed", message: insErr?.message }, 500);

      const callBackUrl = `${SUPABASE_URL}/functions/v1/kie-voice-clone-callback?cloneId=${row.id}&step=phrase`;

      // KIE exige enteros, con vocalEndS > vocalStartS (segmento de 3-30 s).
      const startS = Math.max(0, Math.floor(Number(vocalStartS) || 0));
      const rawEnd = Math.floor(Number(vocalEndS) || 0);
      const endS = Math.min(startS + 30, Math.max(startS + 3, rawEnd));

      const kiePayload = {
        voiceUrl,
        vocalStartS: startS,
        vocalEndS: endS,
        language: language || "es",
        callBackUrl,
      };
      console.log("[kie-voice-clone] validate payload", JSON.stringify(kiePayload));

      const kieRes = await fetch(`${KIE_BASE}/voice/validate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${KIE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(kiePayload),
      });
      const kieJson = await kieRes.json().catch(() => ({}));
      if (!kieRes.ok || (kieJson?.code && kieJson.code !== 200)) {
        console.error("[kie-voice-clone] validate failed", kieRes.status, JSON.stringify(kieJson));
        await admin.from("voice_clones").update({
          status: "failed",
          error_message: (kieJson?.msg || `HTTP ${kieRes.status}`).toString().slice(0, 300),
        }).eq("id", row.id);
        return json({
          error: "provider_error",
          providerCode: kieJson?.code ?? kieRes.status,
          message: kieJson?.msg || `HTTP ${kieRes.status}`,
        }, 502);
      }


      const taskId = kieJson?.data?.taskId as string | undefined;
      await admin.from("voice_clones").update({ kie_task_id: taskId ?? null }).eq("id", row.id);

      return json({ ok: true, cloneId: row.id, taskId, status: "pending_phrase" });
    }

    // ── submit_verification ─────────────────────────────────────────────
    if (action === "submit_verification") {
      const { cloneId, verificationAudioUrl, style, singerSkillLevel } = body || {};
      if (!cloneId || !verificationAudioUrl) {
        return json({ error: "cloneId_and_verificationAudioUrl_required" }, 400);
      }

      const { data: clone } = await admin
        .from("voice_clones")
        .select("id, user_id, kie_task_id, name, status")
        .eq("id", cloneId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!clone) return json({ error: "clone_not_found" }, 404);
      if (clone.status !== "awaiting_verification_recording") {
        return json({ error: "invalid_state", message: `Estado actual: ${clone.status}` }, 409);
      }

      // Cobro del coste de clonación (single source of truth: operation_pricing)
      const { data: pricingRow } = await admin
        .from("operation_pricing")
        .select("credits_cost")
        .eq("operation_key", "clone_voice")
        .eq("is_active", true)
        .maybeSingle();
      const creditsCost = pricingRow?.credits_cost ?? 5;

      const { error: debitErr } = await admin.rpc("debit_user_credits", {
        p_user_id: user.id,
        p_amount: creditsCost,
        p_description: `Clonación de voz (KIE): ${clone.name}`,
      });
      if (debitErr) {
        const msg = String(debitErr.message || "");
        if (msg.includes("insufficient_credits")) return json({ error: "insufficient_credits", required: creditsCost }, 402);
        return json({ error: "debit_failed", message: msg }, 500);
      }

      await admin.from("voice_clones").update({
        verification_audio_url: verificationAudioUrl,
        status: "generating",
      }).eq("id", cloneId);

      const callBackUrl = `${SUPABASE_URL}/functions/v1/kie-voice-clone-callback?cloneId=${cloneId}&step=voice`;

      const kieRes = await fetch(`${KIE_BASE}/voice/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${KIE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: clone.kie_task_id,
          verifyUrl: verificationAudioUrl,
          voiceName: clone.name,
          description: `Voz creada en MusicDibs por el usuario ${user.id}`,
          style: style || undefined,
          singerSkillLevel: singerSkillLevel || "beginner",
          callBackUrl,
        }),
      });
      const kieJson = await kieRes.json().catch(() => ({}));
      if (!kieRes.ok || (kieJson?.code && kieJson.code !== 200)) {
        // Reembolso si el disparo a KIE falla antes de procesar nada.
        await refund(admin, user.id, creditsCost, "KIE voice/generate dispatch failed");
        const kieMsg = kieJson?.msg || `HTTP ${kieRes.status}`;
        await admin.from("voice_clones").update({
          status: "failed",
          error_message: kieMsg,
        }).eq("id", cloneId);
        // FIX 2026-08-26: la frase de verificacion generada en el paso 1
        // caduca tras un tiempo (confirmado por Iker: "Verification phrase
        // expired or not found"). Se detecta este caso especifico para dar
        // un mensaje claro al usuario en vez de un error generico.
        if (/expired|not found/i.test(kieMsg)) {
          return json({ error: "phrase_expired", message: kieMsg }, 410);
        }
        return json({ error: "provider_error", message: kieMsg }, 502);
      }

      // FIX 2026-08-25 (caso miguelangel.perezgarcia@gmail.com, BUG CRITICO
      // de seguridad): antes NUNCA se guardaba el taskId nuevo que devuelve
      // esta llamada (voice/generate, paso 2) -- se seguia usando
      // clone.kie_task_id (el taskId del PASO 1, voice/validate, ya
      // completado) para el resto del proceso, incluido el polling de
      // check_status. Esto hacia que check_status consultara el estado de
      // la tarea EQUIVOCADA (la de generar la frase de verificacion, no la
      // generacion de voz real) -- KIE nunca llego a ejecutar realmente la
      // verificacion de identidad, y algun campo de la respuesta de esa
      // tarea vieja se interpretaba por error como si fuera el voiceId
      // final, marcando la clonacion como "active" SIN QUE LA VERIFICACION
      // REAL SE HUBIERA EJECUTADO NUNCA. Se guarda ahora el taskId correcto
      // del paso 2 antes de continuar.
      const generateTaskId = kieJson?.data?.taskId as string | undefined;
      if (!generateTaskId) {
        await refund(admin, user.id, creditsCost, "KIE voice/generate no devolvió taskId");
        await admin.from("voice_clones").update({
          status: "failed",
          error_message: "KIE no devolvió taskId para la generación de voz",
        }).eq("id", cloneId);
        return json({ error: "provider_error", message: "no_task_id_returned" }, 502);
      }
      await admin.from("voice_clones").update({ kie_task_id: generateTaskId, updated_at: new Date().toISOString() }).eq("id", cloneId);

      return json({ ok: true, cloneId, status: "generating" });
    }

    // ── check_status (fallback manual, por si el callback no llega) ─────
    if (action === "check_status") {
      const { cloneId } = body || {};
      if (!cloneId) return json({ error: "cloneId_required" }, 400);
      const { data: clone } = await admin
        .from("voice_clones")
        .select("id, user_id, status, kie_task_id, verification_phrase, provider_voice_id, error_message")
        .eq("id", cloneId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!clone) return json({ error: "clone_not_found" }, 404);

      if (clone.status === "pending_phrase" && clone.kie_task_id) {
        const infoRes = await fetch(`${KIE_BASE}/voice/validate-info?taskId=${clone.kie_task_id}`, {
          headers: { Authorization: `Bearer ${KIE_API_KEY}` },
        });
        const infoJson = await infoRes.json().catch(() => ({}));
        const phrase = infoJson?.data?.validateInfo as string | undefined;
        const validateStatus = infoJson?.data?.status as string | undefined;
        if (phrase) {
          await admin.from("voice_clones").update({
            verification_phrase: phrase,
            status: "awaiting_verification_recording",
          }).eq("id", cloneId);
          return json({ ok: true, status: "awaiting_verification_recording", verificationPhrase: phrase });
        }
        // FIX 2026-08-26: KIE documenta status explicitos para esta tarea
        // (wait_processing/processing_validate = en curso;
        // processing_validate_fail/fail = fallo real; wait_validating =
        // lista para leer; success = completado). Antes solo mirabamos si
        // "phrase" existia, dejando al usuario esperando indefinidamente
        // con el spinner girando si KIE realmente fallaba sin generar
        // ninguna frase.
        if (validateStatus && /fail/i.test(validateStatus)) {
          const errMsg = infoJson?.data?.errorMessage || infoJson?.msg || `KIE status: ${validateStatus}`;
          await admin.from("voice_clones").update({ status: "failed", error_message: String(errMsg).slice(0, 300) }).eq("id", cloneId);
          return json({ ok: true, status: "failed", error: errMsg });
        }
      }

      if (clone.status === "generating" && clone.kie_task_id) {
        const infoRes = await fetch(`${KIE_BASE}/voice/record-info?taskId=${clone.kie_task_id}`, {
          headers: { Authorization: `Bearer ${KIE_API_KEY}` },
        });
        const infoJson = await infoRes.json().catch(() => ({}));
        const voiceId = infoJson?.data?.voiceId as string | undefined;
        const genStatus = infoJson?.data?.status as string | undefined;
        // FIX 2026-08-26: confirmado con una prueba real en el Playground
        // de KIE que voiceId === taskId es el comportamiento NORMAL de la
        // API en una generacion exitosa (KIE reutiliza el mismo
        // identificador para la tarea y la voz resultante). Un intento
        // anterior de "proteger" contra esto como si fuera un falso
        // positivo estaba mal y bloqueaba resultados genuinos -- revertido.
        // Se usa el campo status ("success") como señal principal, con
        // voiceId como respaldo.
        if (voiceId && (genStatus === "success" || !genStatus)) {
          await admin.from("voice_clones").update({
            provider_voice_id: voiceId,
            status: "active",

          }).eq("id", cloneId);
          return json({ ok: true, status: "active", voiceId });
        }
        // Fallo explicito reportado por KIE (mismo patron de status que en
        // validate-info) -- no dejar esperando si KIE ya dijo que fallo.
        if (genStatus && /fail/i.test(genStatus)) {
          const errMsg = infoJson?.data?.errorMessage || infoJson?.msg || `KIE status: ${genStatus}`;
          await admin.from("voice_clones").update({ status: "failed", error_message: String(errMsg).slice(0, 300) }).eq("id", cloneId);
          return json({ ok: true, status: "failed", error: errMsg });
        }
        // FIX 2026-08-26: salvaguarda de timeout -- si llevamos mas de 10
        // minutos en "generating" sin que KIE reporte ni exito ni fallo
        // explicito (caso real reportado: el spinner del frontend gira
        // indefinidamente sin ningun avance), se marca como fallido en vez
        // de dejar al usuario esperando para siempre.
        const { data: cloneWithTime } = await admin.from("voice_clones").select("updated_at").eq("id", cloneId).single();
        if (cloneWithTime?.updated_at && Date.now() - new Date(cloneWithTime.updated_at).getTime() > 10 * 60 * 1000) {
          await admin.from("voice_clones").update({ status: "failed", error_message: "Timeout: KIE no completó la generación en 10 minutos." }).eq("id", cloneId);
          return json({ ok: true, status: "failed", error: "timeout" });
        }
      }

      return json({ ok: true, status: clone.status, verificationPhrase: clone.verification_phrase, voiceId: clone.provider_voice_id || null, error: clone.error_message });
    }

    return json({ error: "invalid_action" }, 400);
  } catch (err) {
    console.error("[kie-voice-clone] fatal", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function refund(supabase: ReturnType<typeof createClient>, userId: string, amount: number, reason: string) {
  const { data: p } = await supabase.from("profiles").select("available_credits").eq("user_id", userId).single();
  if (!p) return;
  await supabase.from("profiles").update({ available_credits: p.available_credits + amount, updated_at: new Date().toISOString() }).eq("user_id", userId);
  await supabase.from("credit_transactions").insert({ user_id: userId, amount, type: "refund", description: `Reembolso: ${reason}`.slice(0, 200) });
}
