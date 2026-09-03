// Backfill puntual (no cron recurrente): completa profiles.billing_country
// para compradores existentes que no lo tienen, consultando el pais real
// guardado en Stripe (customer.address.country). A diferencia de los UTMs
// (que nunca se capturaron y son irrecuperables), el pais SI esta
// disponible retroactivamente en Stripe para la mayoria de clientes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret" };
const BATCH_SIZE = 40;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { offset = 0 } = await req.json().catch(() => ({}));

  // Solo compradores reales (con al menos 1 orden pagada) sin pais conocido.
  const { data: candidates, error: fetchErr } = await supabase
    .from("profiles")
    .select("user_id, stripe_customer_id")
    .is("billing_country", null)
    .not("stripe_customer_id", "is", null)
    .order("user_id")
    .range(offset, offset + BATCH_SIZE - 1);

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500, headers: corsHeaders });
  }

  let updated = 0;
  let noCountry = 0;
  let errors = 0;

  for (const c of candidates || []) {
    try {
      const res = await fetch(`https://api.stripe.com/v1/customers/${c.stripe_customer_id}`, {
        headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
      });
      const customer = await res.json();
      const country = customer?.address?.country;
      if (country) {
        await supabase.from("profiles").update({
          billing_country: country,
          billing_country_updated_at: new Date().toISOString(),
        }).eq("user_id", c.user_id);
        updated++;
      } else {
        // FIX: marcar como 'XX' (desconocido) para que deje de cumplir el
        // filtro billing_country IS NULL -- de lo contrario, este mismo
        // bloque de candidatos sin pais en Stripe se reprocesa
        // indefinidamente en cada llamada con offset=0, sin avanzar nunca.
        await supabase.from("profiles").update({
          billing_country: "XX",
          billing_country_updated_at: new Date().toISOString(),
        }).eq("user_id", c.user_id);
        noCountry++;
      }
    } catch (err) {
      console.error(`[backfill-billing-country] error for ${c.user_id}:`, err);
      errors++;
    }
  }

  const nextOffset = offset + (candidates?.length ?? 0);
  const done = (candidates?.length ?? 0) < BATCH_SIZE;

  return new Response(JSON.stringify({
    ok: true, offset, nextOffset: done ? null : nextOffset, done,
    checked: candidates?.length ?? 0, updated, noCountry, errors,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
