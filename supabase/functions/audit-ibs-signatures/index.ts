// Auditoria puntual (NO cron recurrente) para detectar firmas iBS que se
// perdieron durante las migraciones internas de mayo 2026 (cuenta de
// firmas en iBS) y julio 2026 (proveedor IPFS, de Infura a otro), aunque
// siguen marcadas como 'success' en nuestra base de datos.
//
// Motivo: caso real cancherbero@gmail.com -- firma con status='success'
// en nuestra BD, pero iBS devuelve 404 "Resource not found" al intentar
// usarla. Se sospecha que la migracion perdio algunas firmas sin que
// nuestro sistema se enterara (nunca revalidamos activamente contra el
// proveedor, solo confiamos en el estado guardado localmente).
//
// Uso: invocar repetidamente con distintos valores de `offset` hasta
// cubrir todo el rango (ver `total` y `checked` en la respuesta para
// saber cuando parar). Cada llamada procesa un lote pequeño para no
// exceder el timeout de la edge function ni saturar la API de iBS.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const IBS_API_URL = "https://api.icommunitylabs.com/v2";
const BATCH_SIZE = 40;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== Deno.env.get("CRON_SECRET")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const IBS_API_KEY = Deno.env.get("IBS_API_KEY");
  if (!IBS_API_KEY) {
    return new Response(JSON.stringify({ error: "IBS_API_KEY not configured" }), { status: 500, headers: corsHeaders });
  }

  const { offset = 0, cutoffDate = "2026-07-16" } = await req.json().catch(() => ({}));

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: signatures, error: fetchErr, count } = await supabase
    .from("ibs_signatures")
    .select("id, user_id, ibs_signature_id, created_at", { count: "exact" })
    .eq("status", "success")
    .lt("created_at", cutoffDate)
    .order("created_at", { ascending: true })
    .range(offset, offset + BATCH_SIZE - 1);

  if (fetchErr) {
    console.error("[audit-ibs-signatures] fetch failed:", fetchErr);
    return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500, headers: corsHeaders });
  }

  const invalid: { id: string; user_id: string; ibs_signature_id: string; created_at: string }[] = [];
  const checked: string[] = [];

  for (const sig of signatures || []) {
    try {
      const res = await fetch(`${IBS_API_URL}/signatures/${sig.ibs_signature_id}`, {
        headers: { Authorization: `Bearer ${IBS_API_KEY}` },
      });
      checked.push(sig.ibs_signature_id);
      if (res.status === 404) {
        invalid.push(sig);
        // Marcamos como invalida y reseteamos el kyc_status del usuario
        // para que se le pida re-verificar la proxima vez que intente
        // registrar una obra -- mismo tratamiento que el caso real.
        await supabase.from("ibs_signatures").update({ status: "invalid_migration", updated_at: new Date().toISOString() }).eq("id", sig.id);
        await supabase.from("profiles").update({ kyc_status: "pending", updated_at: new Date().toISOString() }).eq("user_id", sig.user_id);
      }
    } catch (err) {
      console.error(`[audit-ibs-signatures] error checking ${sig.ibs_signature_id}:`, err);
    }
  }

  const nextOffset = offset + (signatures?.length ?? 0);
  const done = (signatures?.length ?? 0) < BATCH_SIZE;

  console.log(`[audit-ibs-signatures] checked ${checked.length}, invalid ${invalid.length}, offset ${offset}->${nextOffset}, total ${count}, done=${done}`);

  return new Response(JSON.stringify({
    ok: true,
    total: count,
    offset,
    nextOffset: done ? null : nextOffset,
    done,
    checkedCount: checked.length,
    invalidCount: invalid.length,
    invalid,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
