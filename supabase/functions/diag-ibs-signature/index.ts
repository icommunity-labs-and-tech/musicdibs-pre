// Diagnostico y correccion puntual: consulta el estado REAL de una firma
// especifica en el proveedor iBS, y opcionalmente ejecuta el retry (PUT)
// para generar un enlace de verificacion fresco -- util para casos de
// soporte donde el usuario reporta no poder completar su verificacion.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

Deno.serve(async (req) => {
  const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret" };
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }
  const { signatureId, doRetry } = await req.json().catch(() => ({}));
  const IBS_API_KEY = Deno.env.get("IBS_API_KEY");

  const res = await fetch(`https://api.icommunitylabs.com/v2/signatures/${signatureId}`, {
    headers: { Authorization: `Bearer ${IBS_API_KEY}` },
  });
  const data = await res.text();

  if (!doRetry) {
    return new Response(JSON.stringify({ status: res.status, data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const putRes = await fetch(`https://api.icommunitylabs.com/v2/signatures/${signatureId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${IBS_API_KEY}` },
  });
  const putJson = await putRes.json().catch(() => ({}));
  if (!putRes.ok) {
    return new Response(JSON.stringify({ getStatus: res.status, getData: data, retryError: putJson, retryStatus: putRes.status }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const newKycUrl = putJson.url || putJson.kyc_url;
  await supabase.from("ibs_signatures").update({ kyc_url: newKycUrl, status: "initiated", updated_at: new Date().toISOString() }).eq("ibs_signature_id", signatureId);

  return new Response(JSON.stringify({ ok: true, newKycUrl, retryResult: putJson }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
