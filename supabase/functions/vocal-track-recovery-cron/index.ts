// Cron de recuperacion para generaciones de "pista vocal con voz clonada"
// (generate-vocal-track) que se quedan colgadas -- mismo motivo que
// voice-clone-recovery-cron: el callback de KIE puede no entregarse en el
// primer intento (confirmado por Iker: la cancion SI se genero en KIE pero
// el frontend se quedo esperando indefinidamente).
//
// Este flujo tiene 2 pasos encadenados (music -> separation), cada uno con
// su propio callback -- el punto de fallo puede estar en cualquiera de los
// dos. Se resuelve consultando activamente el estado real en KIE via los
// endpoints de consulta (generate/record-info, vocal-removal/record-info).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const KIE_BASE = "https://api.kie.ai/api/v1";
const MIN_STALE_MINUTES = 2;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== Deno.env.get("CRON_SECRET")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const KIE_API_KEY = Deno.env.get("KIE_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  if (!KIE_API_KEY) {
    return new Response(JSON.stringify({ error: "KIE_API_KEY not configured" }), { status: 500, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const staleCutoff = new Date(Date.now() - MIN_STALE_MINUTES * 60 * 1000).toISOString();
  const { data: stuck, error: fetchErr } = await supabase
    .from("ai_generations")
    .select("id, user_id, provider_task_id, audio_url, created_at")
    .eq("model", "vocal_track")
    .eq("audio_url", "")
    .not("provider_task_id", "is", null)
    .lt("created_at", staleCutoff)
    .limit(30);

  if (fetchErr) {
    console.error("[vocal-track-recovery-cron] fetch failed:", fetchErr);
    return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500, headers: corsHeaders });
  }

  const resolved: { id: string; result: string }[] = [];

  for (const gen of stuck || []) {
    try {
      const infoRes = await fetch(`${KIE_BASE}/generate/record-info?taskId=${gen.provider_task_id}`, {
        headers: { Authorization: `Bearer ${KIE_API_KEY}` },
      });
      const infoJson = await infoRes.json().catch(() => ({}));
      const genStatus = infoJson?.data?.status as string | undefined;
      const track = infoJson?.data?.response?.sunoData?.[0];

      if (genStatus === "SUCCESS" && track?.id) {
        const sepCallBackUrl = `${SUPABASE_URL}/functions/v1/kie-vocal-track-callback?generationId=${gen.id}&step=separation&creditsCost=0&fromPermanent=0`;
        const sepRes = await fetch(`${KIE_BASE}/vocal-removal/generate`, {
          method: "POST",
          headers: { Authorization: `Bearer ${KIE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ taskId: gen.provider_task_id, audioId: track.id, type: "separate_vocal", callBackUrl: sepCallBackUrl }),
        });
        const sepJson = await sepRes.json().catch(() => ({}));
        if (sepRes.ok && (!sepJson?.code || sepJson.code === 200)) {
          resolved.push({ id: gen.id, result: "separation_triggered" });
        } else {
          resolved.push({ id: gen.id, result: `separation_trigger_failed: ${sepJson?.msg || sepRes.status}` });
        }
      } else if (genStatus && /FAILED|ERROR/i.test(genStatus)) {
        await supabase.from("ai_generations").delete().eq("id", gen.id);
        resolved.push({ id: gen.id, result: `music_failed: ${genStatus}` });
      }
    } catch (err) {
      console.error(`[vocal-track-recovery-cron] error resolving generation ${gen.id}:`, err);
    }
  }

  console.log(`[vocal-track-recovery-cron] checked ${stuck?.length ?? 0}, resolved ${resolved.length}`);
  return new Response(JSON.stringify({ ok: true, checked: stuck?.length ?? 0, resolved }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
