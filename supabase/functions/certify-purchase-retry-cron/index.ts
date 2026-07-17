import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

// Evidencias en 'pending' durante mas de este umbral se consideran huerfanas
// (el trigger fire-and-forget de certify-purchase no llego a completarse tras
// crear la evidencia -- ver incidente 2026-07-13, 24 evidencias atascadas de
// hasta 3 meses sin ningun reintento automatico).
const STALE_THRESHOLD_HOURS = 24;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== Deno.env.get("CRON_SECRET")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const threshold = new Date(Date.now() - STALE_THRESHOLD_HOURS * 60 * 60 * 1000).toISOString();

    const { data: staleEvidences, error: fetchErr } = await supabaseAdmin
      .from("purchase_evidences")
      .select("id, user_id, product_name, created_at")
      .eq("certification_status", "pending")
      .lt("created_at", threshold)
      .limit(50); // proteccion: no reintentar cientos de golpe en una sola pasada

    if (fetchErr) {
      console.error("[CERTIFY-RETRY] Error fetching stale evidences:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!staleEvidences || staleEvidences.length === 0) {
      return new Response(JSON.stringify({ ok: true, retried: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const certifyUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/certify-purchase`;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const ev of staleEvidences) {
      try {
        // Llamada sincrona (con await) a diferencia del trigger original --
        // esto es justo lo que faltaba: garantizar que la peticion se complete
        // antes de pasar a la siguiente, en vez de fire-and-forget.
        const res = await fetch(certifyUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ evidence_id: ev.id }),
        });

        if (res.ok) {
          succeeded++;
          console.log(`[CERTIFY-RETRY] Evidence ${ev.id} certified OK`);
        } else {
          failed++;
          const errText = await res.text();
          errors.push(`${ev.id}: ${res.status} - ${errText.slice(0, 150)}`);
          console.warn(`[CERTIFY-RETRY] Evidence ${ev.id} failed: ${res.status} - ${errText.slice(0, 150)}`);
        }
      } catch (evErr) {
        failed++;
        errors.push(`${ev.id}: ${evErr}`);
      }
    }

    console.log(`[CERTIFY-RETRY] Checked ${staleEvidences.length}, succeeded ${succeeded}, failed ${failed}`);

    return new Response(
      JSON.stringify({ ok: true, checked: staleEvidences.length, succeeded, failed, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[CERTIFY-RETRY] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
