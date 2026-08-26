// Callback de KIE Suno Voice — recibe la notificación async de cada paso:
// step=phrase -> la frase de verificación ya está lista para mostrarse.
// step=voice  -> la voz personalizada ya se generó (o falló).
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
    const cloneId = url.searchParams.get("cloneId");
    const step = url.searchParams.get("step");
    // FIX 2026-08-26: devolver un error HTTP (400) a KIE cuando algo no
    // encaja hace que KIE marque el callback como fallido
    // ("AiModels callback failed", reportado por Iker) -- una buena
    // practica para webhooks es SIEMPRE aceptar la entrega (200), incluso
    // si no sabemos que hacer con el payload, y registrar el caso raro
    // internamente para investigarlo, en vez de rechazarlo.
    if (!cloneId || !step) {
      console.warn(`[kie-voice-clone-callback] missing_params: cloneId=${cloneId} step=${step} url=${req.url}`);
      return json({ received: true });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const payload = await req.json().catch(() => ({}));
    console.log(`[kie-voice-clone-callback] step=${step} cloneId=${cloneId}`, JSON.stringify(payload).slice(0, 500));

    const { data: clone } = await admin
      .from("voice_clones")
      .select("id, user_id, status, kie_task_id")
      .eq("id", cloneId)
      .maybeSingle();
    if (!clone) {
      console.warn(`[kie-voice-clone-callback] clone ${cloneId} not found`);
      return json({ received: true });
    }

    const code = payload?.data?.code ?? payload?.code;
    const isSuccess = code === undefined || code === 200 || code === "success";

    if (step === "phrase") {
      if (!isSuccess) {
        await admin.from("voice_clones").update({
          status: "failed",
          error_message: payload?.msg || payload?.data?.msg || "Fallo generando la frase de verificación",
        }).eq("id", cloneId);
        return json({ received: true });
      }
      const phrase = payload?.data?.validateInfo || payload?.data?.result?.validateInfo;
      if (phrase) {
        await admin.from("voice_clones").update({
          verification_phrase: phrase,
          status: "awaiting_verification_recording",
        }).eq("id", cloneId);
      }
      return json({ received: true });
    }

    if (step === "voice") {
      if (!isSuccess) {
        const errMsg = payload?.msg || payload?.data?.msg || "Fallo generando la voz personalizada";
        await admin.from("voice_clones").update({ status: "failed", error_message: errMsg }).eq("id", cloneId);
        // Reembolso del coste de clonación, ya que el proceso no llegó a buen puerto.
        const { data: pricingRow } = await admin
          .from("operation_pricing")
          .select("credits_cost")
          .eq("operation_key", "clone_voice")
          .eq("is_active", true)
          .maybeSingle();
        const creditsCost = pricingRow?.credits_cost ?? 5;
        const { data: p } = await admin.from("profiles").select("available_credits").eq("user_id", clone.user_id).single();
        if (p) {
          await admin.from("profiles").update({ available_credits: p.available_credits + creditsCost, updated_at: new Date().toISOString() }).eq("user_id", clone.user_id);
          await admin.from("credit_transactions").insert({ user_id: clone.user_id, amount: creditsCost, type: "refund", description: `Reembolso: clonación de voz fallida (${errMsg})`.slice(0, 200) });
        }
        return json({ received: true });
      }
      const voiceId = payload?.data?.voiceId || payload?.data?.result?.voiceId;
      // FIX 2026-08-26 (BUG DE SEGURIDAD CRITICO, mismo fix que en
      // check_status -- ver ese comentario para el detalle completo):
      // KIE devuelve literalmente voiceId:"fail" cuando la verificacion de
      // identidad vocal no coincide. Se rechaza explicitamente ANTES de
      // aceptarlo como si fuera un voiceId real.
      if (voiceId === "fail") {
        const errMsg = payload?.data?.errorMessage || "La voz de verificación no coincide con la voz original.";
        await admin.from("voice_clones").update({ status: "failed", error_message: String(errMsg).slice(0, 300) }).eq("id", cloneId);
        const { data: pricingRowFail } = await admin.from("operation_pricing").select("credits_cost").eq("operation_key", "clone_voice").eq("is_active", true).maybeSingle();
        const creditsCostFail = pricingRowFail?.credits_cost ?? 5;
        const { data: pFail } = await admin.from("profiles").select("available_credits").eq("user_id", clone.user_id).single();
        if (pFail) {
          await admin.from("profiles").update({ available_credits: pFail.available_credits + creditsCostFail, updated_at: new Date().toISOString() }).eq("user_id", clone.user_id);
          await admin.from("credit_transactions").insert({ user_id: clone.user_id, amount: creditsCostFail, type: "refund", description: `Reembolso: verificación de voz no coincide (${errMsg})`.slice(0, 200) });
        }
        return json({ received: true });
      }
      // FIX 2026-08-26 (CORRECCION): confirmado con una prueba real en el
      // Playground de KIE que voiceId === taskId es NORMAL en un exito
      // genuino -- la comprobacion anterior que rechazaba esto bloqueaba
      // resultados legitimos.
      if (voiceId) {
        await admin.from("voice_clones").update({
          provider_voice_id: voiceId,
          status: "active",
        }).eq("id", cloneId);
      } else {
        await admin.from("voice_clones").update({
          status: "failed",
          error_message: "KIE no devolvió voiceId en el callback de éxito",
        }).eq("id", cloneId);
      }
      return json({ received: true });
    }

    console.warn(`[kie-voice-clone-callback] invalid_step: step=${step} cloneId=${cloneId}`);
    return json({ received: true });
  } catch (err) {
    console.error("[kie-voice-clone-callback] fatal", err);
    return json({ received: true });
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
