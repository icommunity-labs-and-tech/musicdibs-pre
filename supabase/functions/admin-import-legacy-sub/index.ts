// One-shot admin endpoint to import legacy annual subscription into Stripe live
// and link it to the user's profile + local subscriptions row.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRICE_ANNUAL_100 = "price_1T8n6CFULeu7PzK6vs7NZyiJ";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_LIVE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_LIVE_SECRET_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Admin auth check
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

    const { data: roles } = await supabase.from("user_roles")
      .select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roles) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });

    const body = await req.json();
    const { user_id, email, tier = "annual_100", price_id = PRICE_ANNUAL_100 } = body;
    if (!user_id || !email) return new Response(JSON.stringify({ error: "user_id and email required" }), { status: 400, headers: corsHeaders });

    const stripeFetch = async (path: string, params?: Record<string, string>) => {
      const opts: RequestInit = {
        method: params ? "POST" : "GET",
        headers: { Authorization: `Bearer ${stripeKey}` },
      };
      if (params) {
        const body = new URLSearchParams(params);
        opts.body = body;
        (opts.headers as Record<string,string>)["Content-Type"] = "application/x-www-form-urlencoded";
      }
      const res = await fetch(`https://api.stripe.com/v1${path}`, opts);
      const json = await res.json();
      if (!res.ok) throw new Error(`Stripe ${path}: ${JSON.stringify(json)}`);
      return json;
    };

    // 1. Find or create customer
    const list = await stripeFetch(`/customers?email=${encodeURIComponent(email)}&limit=1`);
    let customer = list.data?.[0];
    if (!customer) {
      customer = await stripeFetch("/customers", {
        email,
        "metadata[user_id]": user_id,
        "metadata[migrated]": "true",
      });
    }

    // 2. Check for existing active sub
    const subs = await stripeFetch(`/subscriptions?customer=${customer.id}&status=active&limit=1`);
    let subscription = subs.data?.[0];
    if (!subscription) {
      const trialEnd = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
      subscription = await stripeFetch("/subscriptions", {
        customer: customer.id,
        "items[0][price]": price_id,
        trial_end: String(trialEnd),
        "metadata[user_id]": user_id,
        "metadata[migrated]": "true",
        "metadata[tier]": tier,
      });
    }

    // 3. Sync DB
    await supabase.from("profiles").update({
      stripe_customer_id: customer.id,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user_id);

    await supabase.from("subscriptions").update({
      stripe_customer_id: customer.id,
      stripe_subscription_id: subscription.id,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user_id).eq("status", "active");

    return new Response(JSON.stringify({
      ok: true,
      customer_id: customer.id,
      subscription_id: subscription.id,
      status: subscription.status,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as Error).message) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
