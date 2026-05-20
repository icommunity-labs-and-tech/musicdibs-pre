import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabaseUser.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const rawCode = String(body?.code || "").trim();
    if (!rawCode) return json({ error: "Código requerido" }, 400);
    const code = rawCode.toUpperCase();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find coupon (case insensitive)
    const { data: coupon, error: coupErr } = await admin
      .from("coupons")
      .select("*")
      .ilike("code", code)
      .maybeSingle();

    if (coupErr) {
      console.error("[redeem-coupon] lookup error", coupErr);
      return json({ error: "Error al validar el cupón" }, 500);
    }
    if (!coupon) return json({ error: "Cupón no válido" }, 404);
    if (!coupon.is_active) return json({ error: "Cupón no activo" }, 400);
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return json({ error: "Cupón expirado" }, 400);
    }
    if (
      coupon.max_redemptions !== null &&
      coupon.max_redemptions !== undefined &&
      coupon.redemptions_count >= coupon.max_redemptions
    ) {
      return json({ error: "Cupón agotado" }, 400);
    }

    // A user can only redeem each coupon once, but may redeem different coupons over time
    const { data: prevRedemption, error: prevErr } = await admin
      .from("coupon_redemptions")
      .select("id")
      .eq("user_id", userId)
      .eq("coupon_id", coupon.id)
      .maybeSingle();

    if (prevErr) {
      console.error("[redeem-coupon] prev check error", prevErr);
      return json({ error: "Error al validar el cupón" }, 500);
    }
    if (prevRedemption) {
      return json({ error: "Ya has utilizado este cupón" }, 400);
    }

    // Insert redemption (unique constraint protects races)
    const { error: redErr } = await admin.from("coupon_redemptions").insert({
      coupon_id: coupon.id,
      user_id: userId,
      credits_granted: coupon.credits,
    });
    if (redErr) {
      console.error("[redeem-coupon] insert redemption error", redErr);
      const msg = String(redErr.message || "").toLowerCase();
      if (msg.includes("duplicate") || msg.includes("unique")) {
        return json({ error: "Ya has utilizado este cupón" }, 400);
      }
      return json({ error: "Error al canjear el cupón" }, 500);
    }

    // Increment coupon counter
    await admin
      .from("coupons")
      .update({ redemptions_count: (coupon.redemptions_count || 0) + 1 })
      .eq("id", coupon.id);

    // Update profile credits (available + permanent)
    const { data: profile } = await admin
      .from("profiles")
      .select("available_credits, permanent_credits")
      .eq("user_id", userId)
      .maybeSingle();

    const currentAvail = profile?.available_credits || 0;
    const currentPerm = profile?.permanent_credits || 0;

    await admin
      .from("profiles")
      .update({
        available_credits: currentAvail + coupon.credits,
        permanent_credits: currentPerm + coupon.credits,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    // Log credit transaction
    await admin.from("credit_transactions").insert({
      user_id: userId,
      amount: coupon.credits,
      type: "coupon",
      description: `Cupón: ${coupon.campaign_name} (${coupon.code})`,
      coupon_code: coupon.code,
    });

    return json({
      success: true,
      credits_granted: coupon.credits,
      campaign_name: coupon.campaign_name,
    });
  } catch (e) {
    console.error("[redeem-coupon] error", e);
    return json({ error: e instanceof Error ? e.message : "Error interno" }, 500);
  }
});
