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
    if (!generationId || !step) return json({ error: "missing_params" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const KIE_API_KEY = Deno.env.get("KIE_API_KEY")!;

    const payload = await req.json().catch(() => ({}));
    console.log(`[kie-vocal-track-callback] step=${step} generationId=${generationId}`, JSON.stringify(payload).slice(0, 500));

    const { data: generation } = await admin
      .from("ai_generations")
      .select("id, user_id, status")
      .eq("id", generationId)
      .maybeSingle();
    if (!generation) {
      console.warn(`[kie-vocal-track-callback] generation ${generationId} not found`);
      return json({ received: true });
    }

    const code = payload?.data?.code ?? payload?.code;
    const isSuccess = code === undefined || code === 200 || code === "success";

    const failAndRefund = async (reason: string) => {
      await admin.from("ai_generations").update({ status: "failed" }).eq("id", generationId);
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
      const track = payload?.data?.data?.[0] ?? payload?.data?.response?.sunoData?.[0];
      const taskId = payload?.data?.taskId as string | undefined;
      const audioId = track?.id as string | undefined;
      if (!taskId || !audioId) {
        await failAndRefund("KIE no devolvió taskId/audioId en el callback de música");
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
        await failAndRefund(sepJson?.msg || "Fallo iniciando la separación de voz/instrumental");
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
        await admin.from("ai_generations").update({ audio_url: pub.publicUrl, status: "completed" }).eq("id", generationId);
        console.log(`[kie-vocal-track-callback] completed generation ${generationId}`);
      } catch (persistErr) {
        console.error("[kie-vocal-track-callback] failed persisting vocal track, using provider URL directly:", persistErr);
        // Red de seguridad: si falla la persistencia propia, al menos guardamos
        // la URL de KIE para que el usuario no se quede sin nada.
        await admin.from("ai_generations").update({ audio_url: vocalUrl, status: "completed" }).eq("id", generationId);
      }
      return json({ received: true });
    }

    return json({ error: "invalid_step" }, 400);
  } catch (err) {
    console.error("[kie-vocal-track-callback] fatal", err);
    return json({ received: true });
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
