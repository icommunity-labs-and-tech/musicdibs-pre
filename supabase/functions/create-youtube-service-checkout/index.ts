import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: "2025-08-27.basil" });

const SERVICE_NAMES: Record<string, string> = {
  oac: "Canal Oficial de Artista (OAC) - YouTube",
  content_id: "YouTube Content ID - Solicitud de autorizacion",
};

const SERVICE_PRICE_IDS: Record<string, string> = {
  oac: "price_1TfJv8FULeu7PzK6EdfbwfE2",
  content_id: "price_1TfJsDFULeu7PzK69BVccq6D",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  try {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return json({ error: "No autorizado" }, 401);

    const { serviceType, formData } = await req.json();
    if (!["oac", "content_id"].includes(serviceType)) return json({ error: "Tipo invalido" }, 400);

    const priceId = SERVICE_PRICE_IDS[serviceType];
    if (!priceId) return json({ error: "Precio no configurado" }, 500);

    // Add-on: fusion del canal VEVO con el OAC (+5 EUR). Solo aplica a serviceType 'oac'
    // y solo si el usuario respondio 'yes' en el paso oac_vevo_merge del wizard.
    const wantsVevoMerge = serviceType === "oac" && formData?.vevoMerge === "yes";
    const amountGross = 50.0 + (wantsVevoMerge ? 5.0 : 0);

    const { data: reqRecord, error: dbErr } = await supabase
      .from("youtube_service_requests")
      .insert({
        user_id: user.id,
        service_type: serviceType,
        status: "pending_payment",
        form_data: formData,
        amount_gross: amountGross,
        currency: "eur",
      })
      .select("id")
      .single();
    if (dbErr || !reqRecord) {
      console.error("[yt-checkout] db insert error", dbErr);
      return json({ error: "Error al guardar la solicitud" }, 500);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();
    let customerId = profile?.stripe_customer_id;
    if (!customerId || !customerId.startsWith("cus_")) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabase.from("profiles").update({ stripe_customer_id: customer.id }).eq("user_id", user.id);
    }

    const origin = req.headers.get("origin") || "https://musicdibs.com";
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [{ price: priceId, quantity: 1 }];
    if (wantsVevoMerge) {
      lineItems.push({
        price_data: {
          currency: "eur",
          unit_amount: 500,
          product_data: { name: "Fusion del canal VEVO con el Canal Oficial de Artista (OAC)" },
        },
        quantity: 1,
      });
    }
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: origin + "/dashboard/youtube-services?success=1&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: origin + "/dashboard/youtube-services?cancelled=1",
      metadata: {
        product_type: "youtube_service",
        service_type: serviceType,
        youtube_request_id: reqRecord.id,
        user_id: user.id,
        vevo_merge_addon: wantsVevoMerge ? "1" : "0",
      },
      payment_intent_data: {
        metadata: {
          product_type: "youtube_service",
          service_type: serviceType,
          youtube_request_id: reqRecord.id,
          user_id: user.id,
          vevo_merge_addon: wantsVevoMerge ? "1" : "0",
        },
        description: SERVICE_NAMES[serviceType] + (wantsVevoMerge ? " + fusion VEVO" : ""),
      },
    });
    await supabase
      .from("youtube_service_requests")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", reqRecord.id);

    return json({ url: session.url, requestId: reqRecord.id });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error inesperado";
    console.error("[yt-checkout] error:", msg);
    return json({ error: msg }, 500);
  }
});
