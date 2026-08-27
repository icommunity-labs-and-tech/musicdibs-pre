// Callback de generate-vocal-track (KIE) — encadena 2 pasos asíncronos:
// step=music       -> la canción completa (voz+instrumental) está lista;
//                      dispara la separación de stems para quedarnos solo
//                      con la pista de voz.
// step=separation   -> la separación terminó; descargamos la pista de voz,
//                      la subimos a nuestro storage y marcamos completado.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const generationId = url.searchParams.get("generationId");
    const step = url.searchParams.get("step");
    const creditsCost = Number(url.searchParams.get("creditsCost") ?? "0");
    const fromPermanent = Number(url.searchParams.get("fromPermanent") ?? "0");
    // FIX 2026-08-26: nunca devolver un error HTTP a KIE por parametros
    // inesperados -- mismo fix que en kie-voice-clone-callback, para que
    // KIE no marque el callback como fallido ("AiModels callback failed").
    if (!generationId || !step) {
      console.warn(`[kie-vocal-track-callback] missing_params: generationId=${generationId} step=${step}`);
      return json({ received: true });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const KIE_API_KEY = Deno.env.get("KIE_API_KEY")!;

    const payload = await req.json().catch(() => ({}));
    console.log(`[kie-vocal-track-callback] step=${step} generationId=${generationId}`, JSON.stringify(payload).slice(0, 500));

    const { data: generation } = await admin
      .from("ai_generations")
      .select("id, user_id, error_message, audio_url")
      .eq("id", generationId)
      .maybeSingle();
    if (!generation) {
      console.warn(`[kie-vocal-track-callback] generation ${generationId} not found`);
      return json({ received: true });
    }
    // FIX 2026-08-27: guard de idempotencia -- si esta generacion ya quedo
    // marcada como fallida (error_message) o ya se completo (audio_url),
    // no reprocesar. Evita un doble reembolso si el mismo callback llega
    // duplicado (patron ya visto varias veces con los callbacks de KIE).
    if (generation.error_message || generation.audio_url) {
      console.log(`[kie-vocal-track-callback] generation ${generationId} already resolved, skipping`);
      return json({ received: true });
    }

    const code = payload?.data?.code ?? payload?.code;
    const isSuccess = code === undefined || code === 200 || code === "success";

    const failAndRefund = async (reason: string) => {
      // FIX 2026-08-27 (reportado por Iker: "el proceso si se hizo
      // completo en KIE, pero el front se queda esperando" -- el spinner
      // no avanzaba nunca): antes se borraba la fila por completo con
      // DELETE en cualquier fallo (ej. si la separacion de voz/
      // instrumental fallaba tras generarse la musica con exito) -- el
      // frontend seguia haciendo polling sobre un id que ya no existia en
      // la base de datos, sin ningun mensaje de error, quedandose
      // "cargando" para siempre. Se marca el fallo en su lugar,
      // preservando el registro para que el frontend lo detecte y lo
      // muestre al usuario.
      await admin.from("ai_generations").update({ error_message: reason.slice(0, 300) }).eq("id", generationId);
      if (creditsCost > 0) {
        await admin.rpc("refund_credits_ordered", {
          p_user_id: generation.user_id, p_amount: creditsCost, p_from_permanent: fromPermanent,
          p_reason: `Reembolso: ${reason}`,
        });
      }
    };

    if (step === "music") {
      if (!isSuccess) {
        await failAndRefund(payload?.msg || "Fallo generando la pista con la voz clonada");
        return json({ received: true });
      }
      // FIX 2026-08-27 (CAUSA RAIZ REAL, confirmada con la documentacion
      // oficial de KIE tras diagnosticar con el payload completo
      // capturado): KIE envia VARIOS callbacks progresivos para la misma
      // tarea de generacion de musica -- "text" (letra generada, SIN
      // audio todavia), "first" (primera pista lista) y "complete" (todas
      // las pistas listas). Nuestro codigo procesaba el PRIMER callback
      // que llegaba (siempre "text", con audio_url vacio) como si fuera
      // el resultado final, e intentaba separar la voz de un audio que
      // aun no existia -- de ahi el "Record does not exist" reportado por
      // Iker en 3 intentos seguidos. Se ignoran los callbacks que no sean
      // "complete", esperando al callback real con el audio.
      const callbackType = payload?.data?.callbackType as string | undefined;
      if (callbackType && callbackType !== "complete") {
        console.log(`[kie-vocal-track-callback] step=music callbackType=${callbackType} (intermedio, esperando 'complete')`);
        return json({ received: true });
      }
      // FIX 2026-08-27 (fallo sistematico reportado por Iker, 2 intentos
      // seguidos con el mismo motivo): antes se exigia que "taskId"
      // viniera en el payload del callback (payload?.data?.taskId) -- pero
      // ya tenemos el taskId real guardado en nuestra BD desde el momento
      // en que se disparo la generacion (provider_task_id), asi que no es
      // necesario depender de que el callback lo repita en una estructura
      // exacta. Se amplia tambien la busqueda del audioId a mas
      // estructuras posibles, y se guarda el payload COMPLETO en
      // response_payload si aun asi falla, para poder diagnosticar sin
      // depender de logs.
      const { data: genRow } = await admin.from("ai_generations").select("provider_task_id").eq("id", generationId).maybeSingle();
      const taskId = genRow?.provider_task_id || (payload?.data?.taskId as string | undefined);
      const track =
        payload?.data?.data?.[0] ??
        payload?.data?.response?.sunoData?.[0] ??
        payload?.data?.sunoData?.[0] ??
        payload?.data?.response?.data?.[0] ??
        payload?.response?.sunoData?.[0];
      const audioId = track?.id as string | undefined;
      // FIX 2026-08-27: guardar SIEMPRE el payload de music (no solo
      // cuando falla la extraccion) para tener visibilidad completa de la
      // estructura real que envia KIE, dado el fallo posterior
      // "Record does not exist" en el paso de separacion que no dejaba
      // ningun rastro de que taskId/audioId se habian enviado.
      await admin.from("ai_generations").update({ response_payload: payload }).eq("id", generationId);
      if (!taskId || !audioId) {
        await failAndRefund(`KIE no devolvió taskId/audioId en el callback de música (taskId=${taskId ? "ok" : "missing"}, audioId=${audioId ? "ok" : "missing"})`);
        return json({ received: true });
      }

      // Encadenar el paso de separación de stems para quedarnos solo con la voz.
      const sepCallBackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/kie-vocal-track-callback?generationId=${generationId}&step=separation&creditsCost=${creditsCost}&fromPermanent=${fromPermanent}`;
      const sepRes = await fetch("https://api.kie.ai/api/v1/vocal-removal/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${KIE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, audioId, type: "separate_vocal", callBackUrl: sepCallBackUrl }),
      });
      const sepJson = await sepRes.json().catch(() => ({}));
      if (!sepRes.ok || (sepJson?.code && sepJson.code !== 200)) {
        // FIX 2026-08-27: guardar el request que enviamos (taskId/audioId
        // exactos) junto con la respuesta real de error de KIE, para poder
        // diagnosticar con certeza el motivo del rechazo (ej. "Record does
        // not exist" reportado por Iker, sin ningun detalle previo).
        await admin.from("ai_generations").update({
          response_payload: { music_callback: payload, separation_request: { taskId, audioId }, separation_error: sepJson, separation_status: sepRes.status },
        }).eq("id", generationId);
        await failAndRefund(sepJson?.msg || `Fallo iniciando la separación de voz/instrumental (HTTP ${sepRes.status})`);
        return json({ received: true });
      }
      return json({ received: true });
    }

    if (step === "separation") {
      if (!isSuccess) {
        await failAndRefund(payload?.msg || "Fallo separando la voz de la instrumental");
        return json({ received: true });
      }
      const vocalUrl = payload?.data?.vocalUrl || payload?.data?.response?.vocalUrl;
      if (!vocalUrl) {
        await failAndRefund("KIE no devolvió vocalUrl en el callback de separación");
        return json({ received: true });
      }

      // Descargar la pista de voz y persistirla en nuestro propio storage.
      try {
        const fileRes = await fetch(vocalUrl);
        if (!fileRes.ok) throw new Error(`download failed: ${fileRes.status}`);
        const buf = await fileRes.arrayBuffer();
        const path = `${generation.user_id}/vocal_${Date.now()}.mp3`;
        const { error: upErr } = await admin.storage.from("ai-generations").upload(path, buf, { contentType: "audio/mpeg", upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = admin.storage.from("ai-generations").getPublicUrl(path);
        await admin.from("ai_generations").update({ audio_url: pub.publicUrl }).eq("id", generationId);
        console.log(`[kie-vocal-track-callback] completed generation ${generationId}`);
      } catch (persistErr) {
        console.error("[kie-vocal-track-callback] failed persisting vocal track, using provider URL directly:", persistErr);
        // Red de seguridad: si falla la persistencia propia, al menos guardamos
        // la URL de KIE para que el usuario no se quede sin nada.
        await admin.from("ai_generations").update({ audio_url: vocalUrl }).eq("id", generationId);
      }
      return json({ received: true });
    }

    console.warn(`[kie-vocal-track-callback] invalid_step: step=${step} generationId=${generationId}`);
    return json({ received: true });
  } catch (err) {
    console.error("[kie-vocal-track-callback] fatal", err);
    return json({ received: true });
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
