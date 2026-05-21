// supabase/functions/kie-midi-callback/index.ts
// Webhook público — recibe los callbacks de KIE para el pipeline MIDI.
// Gestiona dos etapas via ?stage=separation|midi&token=TOKEN
//
// Etapa 1 (separation):
//   KIE ha terminado la separación de stems.
//   Extraemos el taskId de separación y llamamos a /api/v1/midi/generate.
//   Actualizamos el log a status: 'pending_midi'.
//
// Etapa 2 (midi):
//   KIE ha generado el MIDI.
//   Extraemos la URL del archivo MIDI y marcamos el log como 'completed'.
//   output_url contiene la URL del MIDI (o JSON con múltiples archivos).
//
// verify_jwt = false  ← añadir en supabase/config.toml
// Deploy: supabase functions deploy kie-midi-callback

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return ok({});

  try {
    const url = new URL(req.url);
    const stage = url.searchParams.get("stage") || "separation";
    const callbackToken = url.searchParams.get("token");

    const body = await req.json().catch(() => ({}));
    console.log("[kie-midi-callback] received", {
      stage,
      code: body?.code,
      type: body?.data?.callbackType,
    });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const KIE_API_KEY = Deno.env.get("KIE_API_KEY")!;
    const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const taskId = body?.data?.task_id || body?.data?.taskId;
    const callbackType = body?.data?.callbackType || body?.data?.callback_type;

    // Ignorar callbacks intermedios — solo procesar "complete"
    if (callbackType && callbackType !== "complete") {
      console.log("[kie-midi-callback] ignoring intermediate callback", { stage, taskId, callbackType });
      return ok({ ignored: callbackType });
    }

    // ── Localizar fila en ai_generation_logs ────────────────────────────────
    let logRow: Record<string, unknown> | null = null;

    if (callbackToken) {
      const { data } = await supabase
        .from("ai_generation_logs")
        .select("*")
        .eq("callback_token", callbackToken)
        .maybeSingle();
      logRow = data;
    }

    if (!logRow && taskId) {
      const { data } = await supabase
        .from("ai_generation_logs")
        .select("*")
        .eq("provider_task_id", taskId)
        .eq("feature_key", "midi_generate")
        .maybeSingle();
      logRow = data;
    }

    if (!logRow) {
      console.warn("[kie-midi-callback] no matching log row", { stage, taskId, token: callbackToken });
      return ok({ warning: "no log row" });
    }

    // ── Validar callback_token ────────────────────────────────────────────────
    if (!logRow.callback_token || logRow.callback_token !== callbackToken) {
      console.warn("[kie-midi-callback] token mismatch");
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Idempotencia ──────────────────────────────────────────────────────────
    if (logRow.status === "completed") {
      console.log("[kie-midi-callback] already completed", logRow.id);
      return ok({ already: true });
    }

    const logId = logRow.id as string;
    const userId = logRow.user_id as string;
    const code = body?.code;

    // ── KIE reporta fallo ─────────────────────────────────────────────────────
    if (code && code !== 200 && code !== 0) {
      console.error("[kie-midi-callback] KIE failure code", code, { stage, logId });

      // Reembolso
      const { data: profile } = await supabase
        .from("profiles")
        .select("available_credits")
        .eq("user_id", userId)
        .single();
      if (profile) {
        const charged = (logRow.user_credits_charged as number) || 0;
        if (charged > 0) {
          await supabase
            .from("profiles")
            .update({
              available_credits: (profile.available_credits as number) + charged,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
          await supabase.from("credit_transactions").insert({
            user_id: userId,
            amount: charged,
            type: "refund",
            description: `Reembolso: KIE MIDI falló en etapa ${stage}`,
          });
        }
      }

      await supabase
        .from("ai_generation_logs")
        .update({
          status: "failed",
          error_message: body?.msg || `KIE code ${code} at stage ${stage}`,
          response_payload: body,
        })
        .eq("id", logId);

      return ok({ ok: false, refunded: true });
    }

    // ════════════════════════════════════════════════════════════════════════════
    // ETAPA 1: SEPARATION COMPLETADA → llamar a MIDI generate
    // ════════════════════════════════════════════════════════════════════════════
    if (stage === "separation") {
      // Extraer el taskId de la separación completada
      const separationTaskId: string | null =
        (body?.data?.task_id as string) ||
        (body?.data?.taskId as string) ||
        null;

      if (!separationTaskId) {
        console.warn("[kie-midi-callback] no separation taskId in payload", JSON.stringify(body).slice(0, 300));
        await supabase
          .from("ai_generation_logs")
          .update({
            status: "failed",
            error_message: "No separation taskId in KIE response",
            response_payload: body,
          })
          .eq("id", logId);
        return ok({ warning: "no separation taskId" });
      }

      // Preparar callback para la etapa MIDI
      const midiCallbackToken = callbackToken; // mismo token, diferente stage
      const midiCallBackUrl = `${SUPABASE_URL}/functions/v1/kie-midi-callback?stage=midi&token=${midiCallbackToken}`;

      console.log("[kie-midi-callback] separation done, calling MIDI generate", {
        logId,
        separationTaskId,
      });

      // Llamar a KIE MIDI generate
      const midiRes = await fetch("https://api.kie.ai/api/v1/midi/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${KIE_API_KEY}`,
        },
        body: JSON.stringify({
          taskId: separationTaskId,
          callBackUrl: midiCallBackUrl,
        }),
      });

      const midiBody = await midiRes.json().catch(() => ({ code: -1, msg: "parse error" }));
      console.log("[kie-midi-callback] MIDI generate response", {
        status: midiRes.status,
        code: midiBody?.code,
      });

      if (!midiRes.ok || (midiBody?.code !== 200 && midiBody?.code !== 0)) {
        // Reembolso
        const { data: profile } = await supabase
          .from("profiles")
          .select("available_credits")
          .eq("user_id", userId)
          .single();
        if (profile) {
          const charged = (logRow.user_credits_charged as number) || 0;
          if (charged > 0) {
            await supabase
              .from("profiles")
              .update({
                available_credits: (profile.available_credits as number) + charged,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", userId);
            await supabase.from("credit_transactions").insert({
              user_id: userId,
              amount: charged,
              type: "refund",
              description: "Reembolso: KIE MIDI generate falló tras separación",
            });
          }
        }

        await supabase
          .from("ai_generation_logs")
          .update({
            status: "failed",
            error_message: midiBody?.msg || `KIE MIDI HTTP ${midiRes.status}`,
            response_payload: midiBody,
          })
          .eq("id", logId);

        return ok({ ok: false, refunded: true });
      }

      // Guardar separationTaskId como contexto intermedio y actualizar status
      const midiTaskId = midiBody?.data?.task_id || midiBody?.data?.taskId || null;
      await supabase
        .from("ai_generation_logs")
        .update({
          status: "pending_midi",
          provider_task_id: midiTaskId || separationTaskId,
          response_payload: {
            separation_response: body,
            midi_task_id: midiTaskId,
          },
        })
        .eq("id", logId);

      console.log("[kie-midi-callback] MIDI queued", { logId, midiTaskId });
      return ok({ ok: true, stage: "separation_done", midiTaskId });
    }

    // ════════════════════════════════════════════════════════════════════════════
    // ETAPA 2: MIDI COMPLETADO → extraer URL y marcar completado
    // ════════════════════════════════════════════════════════════════════════════
    if (stage === "midi") {
      // KIE puede devolver:
      //   (a) body.data.midi_url / body.data.data[].midi_url   → URL directa
      //   (b) body.data.instruments[].notes[]                  → JSON con notas (formato actual)
      // Si recibimos (b), codificamos un .mid binario y lo subimos a Storage.

      const tracks: Array<Record<string, unknown>> = Array.isArray(body?.data?.data)
        ? body.data.data
        : [];
      const firstTrack = tracks[0] || body?.data || {};
      let midiUrl: string | null =
        (firstTrack.midi_url as string) ||
        (firstTrack.midiUrl as string) ||
        (body?.data?.midi_url as string) ||
        (body?.data?.midiUrl as string) ||
        null;

      const instruments: Array<{ name?: string; notes?: Array<{ start: number; end: number; pitch: number; velocity: number }> }> =
        (body?.data?.instruments as any) || (firstTrack.instruments as any) || [];

      const charged = (logRow.user_credits_charged as number) || 0;
      const refundCredits = async (reason: string) => {
        if (charged > 0) {
          await supabase.rpc("refund_user_credits", {
            p_user_id: userId,
            p_amount: charged,
            p_reason: reason,
          });
        }
      };

      if (!midiUrl && Array.isArray(instruments) && instruments.length > 0) {
        try {
          const midiBytes = encodeMidiFromInstruments(instruments);
          const objectPath = `${userId}/midi/${logId}.mid`;
          const { error: upErr } = await supabase.storage
            .from("ai-generations")
            .upload(objectPath, midiBytes, {
              contentType: "audio/midi",
              upsert: true,
            });
          if (upErr) throw upErr;
          const { data: pub } = supabase.storage.from("ai-generations").getPublicUrl(objectPath);
          midiUrl = pub?.publicUrl || null;
          console.log("[kie-midi-callback] MIDI encoded & uploaded", { logId, objectPath, size: midiBytes.length });
        } catch (e) {
          console.error("[kie-midi-callback] failed to encode/upload MIDI", e);
          await refundCredits("Reembolso: fallo al codificar/subir MIDI");
          await supabase
            .from("ai_generation_logs")
            .update({
              status: "failed",
              error_message: `Failed to encode MIDI: ${(e as Error).message}`,
              response_payload: body,
            })
            .eq("id", logId);
          return ok({ warning: "midi_encode_failed", refunded: charged > 0 });
        }
      }

      if (!midiUrl) {
        console.warn("[kie-midi-callback] no midi_url and no instruments in payload", JSON.stringify(body).slice(0, 400));
        await refundCredits("Reembolso: KIE no devolvió MIDI ni notas inline");
        await supabase
          .from("ai_generation_logs")
          .update({
            status: "failed",
            error_message: "No midi_url in KIE response",
            response_payload: body,
          })
          .eq("id", logId);
        return ok({ warning: "no midi_url", refunded: charged > 0 });
      }


      const allMidiUrls = tracks
        .map((t) => (t.midi_url || t.midiUrl) as string)
        .filter(Boolean);
      const outputUrl =
        allMidiUrls.length > 1
          ? JSON.stringify({ midi_files: allMidiUrls })
          : midiUrl;

      await supabase
        .from("ai_generation_logs")
        .update({
          status: "completed",
          output_url: outputUrl,
          response_payload: body,
        })
        .eq("id", logId);

      console.log("[kie-midi-callback] MIDI completed", { logId, outputUrl });
      return ok({ ok: true, logId, midiUrl: outputUrl });
    }

    // Stage desconocido
    console.warn("[kie-midi-callback] unknown stage", stage);
    return ok({ warning: `unknown stage: ${stage}` });

  } catch (err) {
    console.error("[kie-midi-callback] fatal", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function ok(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Encoder MIDI (Type-1) a partir del JSON de instrumentos/notas de KIE.
// Notas: { start, end, pitch, velocity (0-1) } — start/end en segundos.
// Tempo fijo 120 BPM (500000 us/qn), división 480 ticks/quarter
//   → 1 segundo = 960 ticks.
// ─────────────────────────────────────────────────────────────────────────────
function encodeMidiFromInstruments(
  instruments: Array<{ name?: string; notes?: Array<{ start: number; end: number; pitch: number; velocity: number }> }>
): Uint8Array {
  const TICKS_PER_QUARTER = 480;
  const TICKS_PER_SECOND = 960; // 120 BPM

  const validInstruments = instruments.filter((i) => Array.isArray(i.notes) && i.notes.length > 0);
  const numTracks = validInstruments.length || 1;

  const chunks: number[][] = [];

  // Header
  chunks.push([
    0x4d, 0x54, 0x68, 0x64, // "MThd"
    0x00, 0x00, 0x00, 0x06, // length 6
    0x00, 0x01,             // format 1
    (numTracks >> 8) & 0xff, numTracks & 0xff,
    (TICKS_PER_QUARTER >> 8) & 0xff, TICKS_PER_QUARTER & 0xff,
  ]);

  // Conductor track (tempo)
  // Actually, format 1 typically has tempo in track 0. Add a tempo-only track first
  // and increment the track count above? Simpler: embed tempo in the first instrument track.

  validInstruments.forEach((inst, idx) => {
    const events: Array<{ tick: number; data: number[]; order: number }> = [];
    const channel = idx % 16;

    // Tempo only on first track
    if (idx === 0) {
      events.push({ tick: 0, order: 0, data: [0xff, 0x51, 0x03, 0x07, 0xa1, 0x20] }); // 500000 us/qn
    }

    // Optional track name
    if (inst.name) {
      const nameBytes = new TextEncoder().encode(inst.name.slice(0, 64));
      events.push({
        tick: 0,
        order: 1,
        data: [0xff, 0x03, ...vlq(nameBytes.length), ...Array.from(nameBytes)],
      });
    }

    for (const note of inst.notes || []) {
      const startTick = Math.max(0, Math.round(note.start * TICKS_PER_SECOND));
      const endTick = Math.max(startTick + 1, Math.round(note.end * TICKS_PER_SECOND));
      const pitch = Math.max(0, Math.min(127, Math.round(note.pitch)));
      const velRaw = typeof note.velocity === "number" ? note.velocity : 0.8;
      const velocity = Math.max(1, Math.min(127, Math.round(velRaw <= 1 ? velRaw * 127 : velRaw)));
      events.push({ tick: startTick, order: 2, data: [0x90 | channel, pitch, velocity] });
      events.push({ tick: endTick, order: 2, data: [0x80 | channel, pitch, 0] });
    }

    // End of track
    events.sort((a, b) => a.tick - b.tick || a.order - b.order);

    const trackBytes: number[] = [];
    let lastTick = 0;
    for (const ev of events) {
      const delta = ev.tick - lastTick;
      lastTick = ev.tick;
      trackBytes.push(...vlq(delta), ...ev.data);
    }
    // End-of-track meta
    trackBytes.push(0x00, 0xff, 0x2f, 0x00);

    const len = trackBytes.length;
    chunks.push([
      0x4d, 0x54, 0x72, 0x6b, // "MTrk"
      (len >>> 24) & 0xff, (len >>> 16) & 0xff, (len >>> 8) & 0xff, len & 0xff,
      ...trackBytes,
    ]);
  });

  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

function vlq(value: number): number[] {
  const buffer: number[] = [];
  let v = value & 0x0fffffff;
  buffer.push(v & 0x7f);
  v >>= 7;
  while (v > 0) {
    buffer.push((v & 0x7f) | 0x80);
    v >>= 7;
  }
  return buffer.reverse();
}
