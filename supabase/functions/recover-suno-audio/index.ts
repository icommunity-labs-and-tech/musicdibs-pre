// Recuperacion puntual de audios afectados por el incidente de
// encriptacion de Suno (28 de agosto de 2026, ventana 20:00-21:00 UTC).
// KIE lanzo un nuevo endpoint (Suno Audio Recovery API) para restaurar
// los enlaces de descarga rotos por ese cambio. Esta funcion recupera el
// audio real via ese endpoint y lo vuelve a copiar a nuestro storage
// propio, actualizando ai_generations.audio_url.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret" };
const KIE_BASE = "https://api.kie.ai/api/v1";
const BUCKET = "ai-generations";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const KIE_API_KEY = Deno.env.get("KIE_API_KEY");
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { generationId } = await req.json().catch(() => ({}));

  const { data: gen } = await supabase.from("ai_generations").select("id, user_id, provider_task_id, audio_url").eq("id", generationId).maybeSingle();
  if (!gen) return new Response(JSON.stringify({ error: "generation_not_found" }), { status: 404, headers: corsHeaders });

  // Paso 1: disparar la recuperacion.
  const recRes = await fetch(`${KIE_BASE}/suno/recovery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KIE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ task_id: gen.provider_task_id }),
  });
  const recJson = await recRes.json().catch(() => ({}));
  if (!recRes.ok || recJson?.code !== 200) {
    return new Response(JSON.stringify({ step: "recovery_start", ok: false, status: recRes.status, data: recJson }), { headers: corsHeaders });
  }
  const recoveryTaskId = recJson?.data?.task_id;

  // Paso 2: polling del resultado (hasta ~20s, deberia ser rapido).
  let recoveredUrl: string | undefined;
  let lastPollJson: unknown;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const pollRes = await fetch(`${KIE_BASE}/suno/recovery/record-info?task_id=${recoveryTaskId}`, {
      headers: { Authorization: `Bearer ${KIE_API_KEY}` },
    });
    const pollJson = await pollRes.json().catch(() => ({}));
    lastPollJson = pollJson;
    const track = pollJson?.data?.data?.[0] ?? pollJson?.data?.response?.sunoData?.[0] ?? pollJson?.data?.sunoData?.[0];
    if (track?.audio_url || track?.audioUrl) {
      recoveredUrl = track.audio_url || track.audioUrl;
      break;
    }
    if (pollJson?.data?.status && /fail/i.test(pollJson.data.status)) {
      return new Response(JSON.stringify({ step: "recovery_poll", ok: false, data: pollJson }), { headers: corsHeaders });
    }
  }
  if (!recoveredUrl) {
    return new Response(JSON.stringify({ step: "recovery_poll", ok: false, error: "timeout", lastPollJson }), { headers: corsHeaders });
  }

  // Paso 3: descargar el audio ya recuperado y copiarlo a nuestro storage.
  const audioRes = await fetch(recoveredUrl);
  if (!audioRes.ok) {
    return new Response(JSON.stringify({ step: "download", ok: false, status: audioRes.status, recoveredUrl }), { headers: corsHeaders });
  }
  const arr = new Uint8Array(await audioRes.arrayBuffer());
  const path = `${gen.user_id}/kie_recovered_${Date.now()}.mp3`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, arr, { contentType: "audio/mpeg", upsert: false });
  if (upErr) {
    return new Response(JSON.stringify({ step: "upload", ok: false, error: upErr.message }), { headers: corsHeaders });
  }
  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
  const finalUrl = signed?.signedUrl;

  await supabase.from("ai_generations").update({ audio_url: finalUrl }).eq("id", generationId);

  return new Response(JSON.stringify({ ok: true, generationId, finalUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
