// Cron de recuperacion para clonaciones de voz "colgadas".
//
// Motivo: el callback de KIE (Suno Voice) puede no llegar a entregarse en
// el primer intento (confirmado por Iker: tuvo que forzar el reenvio
// manual desde el dashboard de KIE mas de una vez). El unico mecanismo
// alternativo que teniamos era el sondeo activo del frontend
// (check_status), que SOLO funciona mientras el usuario tiene la pestaña
// abierta y en primer plano -- si cierra la pestaña o cambia de foco, la
// clonacion queda "generating" indefinidamente hasta el timeout de 10 min
// (que la marca como failed sin haber comprobado el resultado real).
//
// Este cron corre cada 5 minutos, independientemente de si hay algun
// usuario con el navegador abierto, y resuelve activamente cualquier
// clonacion colgada consultando el estado real en KIE -- misma logica que
// check_status en kie-voice-clone/index.ts, incluyendo las salvaguardas de
// seguridad (voiceId:"fail" nunca se acepta como exito).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const KIE_BASE = "https://api.kie.ai/api/v1";
// Solo se intenta resolver clonaciones con al menos este margen desde su
// ultima actualizacion, para no pisarle el sondeo activo al frontend
// mientras el usuario sigue con la pestaña abierta.
const MIN_STALE_MINUTES = 1;

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
  if (!KIE_API_KEY) {
    return new Response(JSON.stringify({ error: "KIE_API_KEY not configured" }), { status: 500, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const staleCutoff = new Date(Date.now() - MIN_STALE_MINUTES * 60 * 1000).toISOString();
  const { data: stuckClones, error: fetchErr } = await supabase
    .from("voice_clones")
    .select("id, user_id, status, kie_task_id, updated_at")
    .in("status", ["pending_phrase", "generating"])
    .not("kie_task_id", "is", null)
    .lt("updated_at", staleCutoff)
    .limit(50);

  if (fetchErr) {
    console.error("[voice-clone-recovery-cron] fetch failed:", fetchErr);
    return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500, headers: corsHeaders });
  }

  const resolved: { id: string; result: string }[] = [];

  for (const clone of stuckClones || []) {
    try {
      if (clone.status === "pending_phrase") {
        const infoRes = await fetch(`${KIE_BASE}/voice/validate-info?taskId=${clone.kie_task_id}`, {
          headers: { Authorization: `Bearer ${KIE_API_KEY}` },
        });
        const infoJson = await infoRes.json().catch(() => ({}));
        const phrase = infoJson?.data?.validateInfo as string | undefined;
        const validateStatus = infoJson?.data?.status as string | undefined;
        if (phrase) {
          await supabase.from("voice_clones").update({
            verification_phrase: phrase,
            status: "awaiting_verification_recording",
          }).eq("id", clone.id);
          resolved.push({ id: clone.id, result: "phrase_ready" });
        } else if (validateStatus && /fail/i.test(validateStatus)) {
          const errMsg = infoJson?.data?.errorMessage || infoJson?.msg || `KIE status: ${validateStatus}`;
          await supabase.from("voice_clones").update({ status: "failed", error_message: String(errMsg).slice(0, 300) }).eq("id", clone.id);
          resolved.push({ id: clone.id, result: `failed: ${errMsg}` });
        }
        continue;
      }

      if (clone.status === "generating") {
        const infoRes = await fetch(`${KIE_BASE}/voice/record-info?taskId=${clone.kie_task_id}`, {
          headers: { Authorization: `Bearer ${KIE_API_KEY}` },
        });
        const infoJson = await infoRes.json().catch(() => ({}));
        const voiceId = infoJson?.data?.voiceId as string | undefined;
        const genStatus = infoJson?.data?.status as string | undefined;

        // Misma salvaguarda de seguridad que en check_status: KIE devuelve
        // literalmente voiceId:"fail" cuando la verificacion de voz no
        // coincide -- nunca se acepta como exito.
        if (voiceId === "fail") {
          const errMsg = infoJson?.data?.errorMessage || "La voz de verificación no coincide con la voz original.";
          const { data: pricingRow } = await supabase.from("operation_pricing").select("credits_cost").eq("operation_key", "clone_voice").eq("is_active", true).maybeSingle();
          const creditsCost = pricingRow?.credits_cost ?? 5;
          const { data: p } = await supabase.from("profiles").select("available_credits").eq("user_id", clone.user_id).single();
          if (p) {
            await supabase.from("profiles").update({ available_credits: p.available_credits + creditsCost, updated_at: new Date().toISOString() }).eq("user_id", clone.user_id);
            await supabase.from("credit_transactions").insert({ user_id: clone.user_id, amount: creditsCost, type: "refund", description: `Reembolso: verificación de voz no coincide (${errMsg})`.slice(0, 200) });
          }
          await supabase.from("voice_clones").update({ status: "failed", error_message: String(errMsg).slice(0, 300) }).eq("id", clone.id);
          resolved.push({ id: clone.id, result: `voice_mismatch: ${errMsg}` });
          continue;
        }

        if (voiceId && (genStatus === "success" || !genStatus)) {
          await supabase.from("voice_clones").update({ provider_voice_id: voiceId, status: "active" }).eq("id", clone.id);
          resolved.push({ id: clone.id, result: `active: ${voiceId}` });
          continue;
        }

        if (genStatus && /fail/i.test(genStatus)) {
          const errMsg = infoJson?.data?.errorMessage || infoJson?.msg || `KIE status: ${genStatus}`;
          await supabase.from("voice_clones").update({ status: "failed", error_message: String(errMsg).slice(0, 300) }).eq("id", clone.id);
          resolved.push({ id: clone.id, result: `failed: ${errMsg}` });
        }
        // Si sigue genuinamente en curso (sin voiceId ni status de fallo),
        // se deja para el siguiente ciclo del cron -- el timeout de 10 min
        // en check_status sigue actuando como ultima red de seguridad.
      }
    } catch (err) {
      console.error(`[voice-clone-recovery-cron] error resolving clone ${clone.id}:`, err);
    }
  }

  console.log(`[voice-clone-recovery-cron] checked ${stuckClones?.length ?? 0}, resolved ${resolved.length}`);
  return new Response(JSON.stringify({ ok: true, checked: stuckClones?.length ?? 0, resolved }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
