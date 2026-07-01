import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth — requiere JWT de usuario
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Leer acción del body: "pause" o "resume"
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "pause"; // "pause" | "resume"

    // Obtener perfil y suscripción
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("subscription_plan, subscription_tier, stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) return json({ error: "Profile not found" }, 404);

    // Solo mensuales pueden pausar
    if (profile.subscription_plan !== "Monthly") {
      return json({
        error: "Solo las suscripciones mensuales pueden pausarse",
        code: "ANNUAL_CANNOT_PAUSE"
      }, 400);
    }

    // Obtener stripe_subscription_id
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_subscription_id, status")
      .eq("user_id", user.id)
      .single();

    if (!sub?.stripe_subscription_id) {
      return json({ error: "No se encontro suscripcion activa" }, 404);
    }

    // Ya pausada?
    if (action === "pause" && sub.status === "paused") {
      return json({ error: "La suscripcion ya esta pausada", code: "ALREADY_PAUSED" }, 400);
    }
    if (action === "resume" && sub.status !== "paused") {
      return json({ error: "La suscripcion no esta pausada", code: "NOT_PAUSED" }, 400);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-06-20",
    });

    if (action === "pause") {
      // Pausar: no cobrar el siguiente ciclo, se reactiva automáticamente
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        pause_collection: {
          behavior: "mark_uncollectible", // no genera deuda, simplemente pausa
        },
      });

      // Actualizar estado en DB
      await supabaseAdmin.from("subscriptions").update({
        status: "paused",
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);

      await supabaseAdmin.from("profiles").update({
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);

      console.log(`[PAUSE-SUB] Usuario ${user.id} pausó suscripción ${sub.stripe_subscription_id}`);

      return json({
        success: true,
        action: "paused",
        message: "Tu suscripcion ha sido pausada. No se realizaran cobros hasta que la reactives.",
        subscription_id: sub.stripe_subscription_id,
      });

    } else {
      // Reanudar: eliminar la pausa
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        pause_collection: "",
      });

      // Actualizar estado en DB
      await supabaseAdmin.from("subscriptions").update({
        status: "active",
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);

      console.log(`[PAUSE-SUB] Usuario ${user.id} reactivó suscripción ${sub.stripe_subscription_id}`);

      return json({
        success: true,
        action: "resumed",
        message: "Tu suscripcion ha sido reactivada. El proximo cobro se realizara en la fecha habitual.",
        subscription_id: sub.stripe_subscription_id,
      });
    }

  } catch (err) {
    console.error("[PAUSE-SUB] Error:", err);
    return json({ error: "Error interno del servidor" }, 500);
  }
});
