import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Captura el pais de origen (por geolocalizacion de IP) de un usuario recien
 * registrado. El frontend llama a esta funcion justo despues de un signUp
 * exitoso, pasando el user_id. No bloquea el registro si falla -- el
 * llamador debe ignorar errores de esta funcion sin afectar el flujo normal.
 *
 * Motivo: no teniamos ningun dato fiable de pais para usuarios que aun no
 * han comprado nada (billing_country solo se rellena tras una compra). Con
 * el pico de registros del 11-12 sept 2026 no pudimos dar un desglose por
 * pais real, solo por idioma detectado del navegador (proxy impreciso).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id_required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // IP real del visitante -- mismo patron ya usado en submit-landing-lead.
    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      null;

    if (!ip) {
      console.warn("[SIGNUP-GEO] No IP found in request headers");
      return new Response(JSON.stringify({ ok: false, reason: "no_ip" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let country: string | null = null;
    try {
      const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,countryCode`);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.status === "success" && geoData.countryCode) {
          country = geoData.countryCode;
        }
      }
    } catch (e) {
      console.error("[SIGNUP-GEO] geolocation lookup failed:", String(e));
    }

    if (!country) {
      return new Response(JSON.stringify({ ok: false, reason: "geolocation_failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // No sobreescribir si ya se capturo antes (evita llamadas repetidas
    // desde otros flujos pisando el dato original del signup).
    const { data: existing } = await supabase
      .from("profiles")
      .select("signup_country")
      .eq("user_id", user_id)
      .maybeSingle();

    if (existing && existing.signup_country) {
      return new Response(JSON.stringify({ ok: true, already_set: true, country: existing.signup_country }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updErr } = await supabase
      .from("profiles")
      .update({ signup_country: country, signup_country_captured_at: new Date().toISOString() })
      .eq("user_id", user_id);

    if (updErr) {
      console.error("[SIGNUP-GEO] update failed:", updErr.message);
      return new Response(JSON.stringify({ ok: false, reason: "db_update_failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, country }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[SIGNUP-GEO] unhandled:", String(e));
    return new Response(JSON.stringify({ ok: false, reason: "unhandled" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
