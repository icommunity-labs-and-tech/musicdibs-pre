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
    if (!cloneId || !step) return json({ error: "missing_params" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const payload = await req.json().catch(() => ({}));
    console.log(`[kie-voice-clone-callback] step=${step} cloneId=${cloneId}`, JSON.stringify(payload).slice(0, 500));

    const { data: clone } = await admin
      .from("voice_clones")
      .select("id, user_id, status")
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

    return json({ error: "invalid_step" }, 400);
  } catch (err) {
    console.error("[kie-voice-clone-callback] fatal", err);
    return json({ received: true });
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
