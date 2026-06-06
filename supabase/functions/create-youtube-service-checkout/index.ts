import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: "2025-08-27.basil" });
const SERVICE_NAMES = { oac: "Canal Oficial de Artista (OAC) - YouTube", content_id: "YouTube Content ID - Solicitud de autorizacion" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null);
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  try {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return new Response(JSON.stringify({ error: "No autorizado" }), { headers: { "Content-Type": "application/json" }, status: 401 });
    const { serviceType, formData } = await req.json();
    if (!["oac","content_id"].includes(serviceType)) return new Response(JSON.stringify({ error: "Tipo invalido" }), { headers: { "Content-Type": "application/json" }, status: 400 });
    const { data: reqRecord, error: dbErr } = await supabase.from("youtube_service_requests").insert({ user_id: user.id, service_type: serviceType, status: "pending_payment", form_data: formData, amount_gross: 50.00, currency: "eur" }).select("id").single();
    if (dbErr || !reqRecord) return new Response(JSON.stringify({ error: "Error al guardar" }), { headers: { "Content-Type": "application/json" }, status: 500 });
    const { data: profile } = await supabase.from("profiles").select("stripe_customer_id").eq("user_id", user.id).single();
    let customerId = profile?.stripe_customer_id;
    if (!customerId || !customerId.startsWith("cus_")) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { supabase_user_id: user.id } });
      customerId = customer.id;
      await supabase.from("profiles").update({ stripe_customer_id: customer.id }).eq("user_id", user.id);
    }
    const origin = req.headers.get("origin") || "https://musicdibs.com";
    const session = await stripe.checkout.sessions.create({
      customer: customerId, mode: "payment", payment_method_types: ["card"],
      line_items: [{ price_data: { currency: "eur", unit_amount: 5000, product_data: { name: SERVICE_NAMES[serviceType] || "Servicio YouTube", description: "Gestion de solicitud. Plazo: 5 dias laborables." } }, quantity: 1 }],
      success_url: origin + "/dashboard/youtube-services?success=1&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: origin + "/dashboard/youtube-services?cancelled=1",
      metadata: { product_type: "youtube_service", service_type: serviceType, youtube_request_id: reqRecord.id, user_id: user.id },
      payment_intent_data: { metadata: { product_type: "youtube_service", service_type: serviceType, youtube_request_id: reqRecord.id, user_id: user.id } },
    });
    await supabase.from("youtube_service_requests").update({ stripe_checkout_session_id: session.id }).eq("id", reqRecord.id);
    return new Response(JSON.stringify({ url: session.url, requestId: reqRecord.id }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error inesperado";
    return new Response(JSON.stringify({ error: msg }), { headers: { "Content-Type": "application/json" }, status: 500 });
  }
});
