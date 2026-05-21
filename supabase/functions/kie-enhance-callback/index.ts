// supabase/functions/kie-enhance-callback/index.ts
// Webhook público que recibe la respuesta de KIE cuando la mejora termina.
// Patrón idéntico a kie-suno-callback.
// verify_jwt = false  ← añadir en supabase/config.toml
//
// Deploy: supabase functions deploy kie-enhance-callback

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return ok({});

  try {
    const url = new URL(req.url);
    const callbackToken = url.searchParams.get("token");

    const body = await req.json().catch(() => ({}));
    console.log("[kie-enhance-callback] received", { code: body?.code, type: body?.data?.callbackType });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const taskId = body?.data?.task_id || body?.data?.taskId;
    const callbackType = body?.data?.callbackType || body?.data?.callback_type;

    // Ignorar callbacks intermedios ("text", "first") — solo procesar "complete"
    if (callbackType && callbackType !== "complete") {
      console.log("[kie-enhance-callback] ignoring intermediate callback", { taskId, callbackType });
      return ok({ ignored: callbackType });
    }

    // ── Localizar fila en ai_generation_logs ────────────────────────────────
    let logRow: Record<string, unknown> | null = null;

    // 1. Buscar por callback_token (método primario y más seguro)
    if (callbackToken) {
      const { data } = await supabase
        .from("ai_generation_logs")
        .select("*")
        .eq("callback_token", callbackToken)
        .maybeSingle();
      logRow = data;
    }

    // 2. Fallback: buscar por provider_task_id
    if (!logRow && taskId) {
      const { data } = await supabase
        .from("ai_generation_logs")
        .select("*")
        .eq("provider_task_id", taskId)
        .maybeSingle();
      logRow = data;
    }

    if (!logRow) {
      console.warn("[kie-enhance-callback] no matching log row", { taskId, token: callbackToken });
      return ok({ warning: "no log row" });
    }

    // ── Validar callback_token ────────────────────────────────────────────────
    if (!logRow.callback_token || logRow.callback_token !== callbackToken) {
      console.warn("[kie-enhance-callback] token mismatch");
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Idempotencia ──────────────────────────────────────────────────────────
    if (logRow.status === "completed") {
      console.log("[kie-enhance-callback] already completed", logRow.id);
      return ok({ already: true });
    }

    const logId = logRow.id as string;
    const userId = logRow.user_id as string;
    const code = body?.code;

    // ── KIE reporta fallo ─────────────────────────────────────────────────────
    if (code && code !== 200 && code !== 0) {
      console.error("[kie-enhance-callback] KIE failure code", code);

      // Reembolso
      const { data: profile } = await supabase
        .from("profiles")
        .select("available_credits")
        .eq("user_id", userId)
        .single();
      if (profile) {
        const charged = (logRow.user_credits_charged as number) || 0;
        await supabase
          .from("profiles")
          .update({
            available_credits: (profile.available_credits as number) + charged,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
        if (charged > 0) {
          await supabase.from("credit_transactions").insert({
            user_id: userId,
            amount: charged,
            type: "refund",
            description: "Reembolso: KIE enhance falló",
          });
        }
      }

      await supabase
        .from("ai_generation_logs")
        .update({
          status: "failed",
          error_message: body?.msg || `KIE code ${code}`,
          response_payload: body,
          output_url: null,
        })
        .eq("id", logId);

      return ok({ ok: false, refunded: true });
    }

    // ── Extraer audio URL del resultado ───────────────────────────────────────
    // KIE devuelve 2 tracks por generación. Tomamos el primero.
    // add-instrumental devuelve: body.data.data[].audio_url (tempfile.aiquickdraw.com)
    // También existe stream_audio_url (musicfile.kie.ai) — sin extensión, menos fiable
    const tracks: Array<Record<string, unknown>> = Array.isArray(body?.data?.data)
      ? body.data.data
      : [];

    const firstTrack = tracks[0] || body?.data || {};
    const kieAudioUrl: string | null =
      (firstTrack.audio_url as string) ||
      (firstTrack.audioUrl as string) ||
      (body?.data?.audio_url as string) ||
      (body?.data?.audioUrl as string) ||
      null;

    if (!kieAudioUrl) {
      console.warn("[kie-enhance-callback] no audio_url in payload", JSON.stringify(body).slice(0, 300));
      await supabase
        .from("ai_generation_logs")
        .update({
          status: "failed",
          error_message: "No audio_url in KIE response",
          response_payload: body,
        })
        .eq("id", logId);
      return ok({ warning: "no audio_url" });
    }

    // ── Re-alojar en Supabase Storage para URL permanente sin CORS ────────────
    // tempfile.aiquickdraw.com es temporal y puede tener restricciones de CORS.
    // Descargamos el audio y lo subimos a nuestro bucket para URL estable.
    let outputUrl = kieAudioUrl; // fallback: URL de KIE si falla la re-subida
    try {
      const audioRes = await fetch(kieAudioUrl, { headers: { "User-Agent": "MusicDibs/1.0" } });
      if (audioRes.ok) {
        const arrayBuffer = await audioRes.arrayBuffer();
        const storePath = `enhance-results/${logId}.mp3`;
        const { data: storageData, error: storageErr } = await supabase.storage
          .from("ai-generations")
          .upload(storePath, new Uint8Array(arrayBuffer), {
            contentType: "audio/mpeg",
            upsert: true,
          });
        if (storageData && !storageErr) {
          const { data: urlData } = supabase.storage
            .from("ai-generations")
            .getPublicUrl(storePath);
          outputUrl = urlData.publicUrl;
          console.log("[kie-enhance-callback] re-uploaded to storage", { storePath, outputUrl });
        } else {
          console.warn("[kie-enhance-callback] storage upload error, using KIE URL", storageErr);
        }
      } else {
        console.warn("[kie-enhance-callback] fetch failed for KIE audio", audioRes.status, kieAudioUrl);
      }
    } catch (fetchErr) {
      console.warn("[kie-enhance-callback] re-upload failed, using KIE URL as fallback", fetchErr);
    }

    // ── Marcar como completado ────────────────────────────────────────────────
    // Guardamos provider_task_id para que kie-midi-generate pueda usar
    // este resultado como fuente de separación de stems → MIDI.
    await supabase
      .from("ai_generation_logs")
      .update({
        status: "completed",
        output_url: outputUrl,
        response_payload: body,
        ...(taskId ? { provider_task_id: taskId } : {}),
      })
      .eq("id", logId);

    // ── Registrar en la biblioteca (ai_generations) ───────────────────────────
    // Para que la canción mejorada aparezca en /dashboard/library como un asset más.
    try {
      const reqPayload = (logRow.request_payload as Record<string, unknown>) || {};
      const mode = (reqPayload.mode as string) || "enhance";
      const promptText =
        (reqPayload.prompt as string) ||
        (reqPayload.source_filename as string) ||
        `Versión IA (${mode})`;
      const genre = (reqPayload.genre as string) || null;
      const mood = (reqPayload.mood as string) || null;
      const duration = Math.round((reqPayload.source_duration_sec as number) || 0);

      const { error: insErr } = await supabase.from("ai_generations").insert({
        user_id: userId,
        prompt: promptText,
        audio_url: outputUrl,
        duration,
        genre,
        mood,
        provider: "kie",
        model: "enhance",
        provider_task_id: taskId || null,
        storage_bucket: "ai-generations",
        storage_path: `enhance-results/${logId}.mp3`,
        request_payload: reqPayload,
        response_payload: body,
      });
      if (insErr) {
        console.warn("[kie-enhance-callback] ai_generations insert failed", insErr);
      }
    } catch (libErr) {
      console.warn("[kie-enhance-callback] library registration failed", libErr);
    }

    console.log("[kie-enhance-callback] completed", { logId, outputUrl, fromStorage: outputUrl !== kieAudioUrl });
    return ok({ ok: true, logId, audioUrl: outputUrl });

  } catch (err) {
    console.error("[kie-enhance-callback] fatal", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }