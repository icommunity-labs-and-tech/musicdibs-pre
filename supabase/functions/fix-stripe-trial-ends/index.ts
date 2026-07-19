import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // FIX 2026-07-19 (security scan): este script de correccion puntual (fix del
  // trial_end para suscripciones creadas 2026-05-12/13) no tenia NINGUNA
  // autenticacion -- cualquiera en internet podia modificar trial_end de
  // suscripciones reales en Stripe. Se anade el mismo patron de auth usado en
  // el resto de crons/scripts administrativos.
  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const authHeader = req.headers.get("Authorization") || "";
  const cronHeader = req.headers.get("x-cron-secret") || "";
  const isAuth = authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` || (!!cronSecret && cronHeader === cronSecret);
  if (!isAuth) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }
  const body = await req.json().catch(() => ({}));
  const offset = Number(body.offset ?? 0);
  const limit = Number(body.limit ?? 40);

  const { data: subs, error } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id, current_period_end, user_id")
    .eq("plan", "Annual")
    .in("status", ["active", "trialing"])
    .like("stripe_subscription_id", "sub_%")
    .gte("current_period_start", "2026-05-12T00:00:00+00")
    .lte("current_period_start", "2026-05-13T23:59:59+00")
    .order("current_period_end", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }

  const results = { offset, limit, fetched: subs?.length ?? 0, success: 0, failed: 0, errors: [] as string[] };
  for (const sub of subs ?? []) {
    const { stripe_subscription_id, current_period_end } = sub;
    const trialEndTs = Math.floor(new Date(current_period_end).getTime() / 1000);
    try {
      const response = await fetch(
        `https://api.stripe.com/v1/subscriptions/${stripe_subscription_id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ trial_end: trialEndTs.toString() }),
        }
      );
      if (!response.ok) {
        const err = await response.text();
        results.failed++;
        results.errors.push(`${stripe_subscription_id}: ${err}`);
      } else {
        results.success++;
      }
    } catch (e) {
      results.failed++;
      results.errors.push(`${stripe_subscription_id}: ${e.message}`);
    }
  }
  return new Response(
    JSON.stringify(results),
    { headers: { "Content-Type": "application/json" } }
  );
});
