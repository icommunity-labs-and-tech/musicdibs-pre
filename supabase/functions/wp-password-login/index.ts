import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Single RPC call does everything: verify PHPass + upgrade to bcrypt + cleanup
    const { data, error } = await supabaseAdmin.rpc("wp_login_verify_and_upgrade", {
      user_email: String(email).toLowerCase(),
      user_password: String(password),
    });

    if (error) {
      console.error("[wp-password-login] RPC error:", error);
      // Return 200 with upgraded:false so frontend fallback doesn't log a runtime error
      return new Response(JSON.stringify({ upgraded: false, reason: "rpc_error" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // data is jsonb: { upgraded: true, user_id: "..." } or { error: "..." }
    if (data?.error) {
      // Not a WP-migrated user or wrong password — return 200 so the caller can fall back gracefully
      return new Response(JSON.stringify({ upgraded: false, reason: data.error }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ upgraded: data?.upgraded ?? false }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("[wp-password-login] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
