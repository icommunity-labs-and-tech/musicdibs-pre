import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ITOA64 = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

async function md5(data: Uint8Array): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest("MD5", data);
  return new Uint8Array(buf);
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}

function phpassEncode64(input: Uint8Array, count: number): string {
  let output = "";
  let i = 0;
  while (i < count) {
    let value = input[i++];
    output += ITOA64[value & 0x3f];
    if (i < count) value |= input[i] << 8;
    output += ITOA64[(value >> 6) & 0x3f];
    if (i++ >= count) break;
    if (i < count) value |= input[i] << 16;
    output += ITOA64[(value >> 12) & 0x3f];
    if (i++ >= count) break;
    output += ITOA64[(value >> 18) & 0x3f];
  }
  return output;
}

async function verifyPhpass(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash.startsWith("$P$") && !storedHash.startsWith("$H$")) return false;
  const iterChar = storedHash[3];
  const iterCount = ITOA64.indexOf(iterChar);
  if (iterCount < 0) return false;
  const iterations = 1 << iterCount;
  const salt = storedHash.substring(4, 12);
  if (salt.length !== 8) return false;
  const enc = new TextEncoder();
  const pwd = enc.encode(password);
  const saltBytes = enc.encode(salt);
  let hash = await md5(concat(saltBytes, pwd));
  for (let i = 0; i < iterations; i++) {
    hash = await md5(concat(hash, pwd));
  }
  const encoded = phpassEncode64(hash, 16);
  const expected = storedHash.substring(12, 12 + encoded.length);
  console.error("[wp-password-login] debug:", { salt, iterations, encoded, expected, match: encoded === expected });
  return encoded === expected;
}

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
    const { data: authData, error: authError } = await supabaseAdmin
      .rpc("get_user_auth_data", { user_email: String(email).toLowerCase() });
    if (authError || !authData || authData.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid login credentials" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { user_id, hash: storedHash } = authData[0];
    if (!storedHash?.startsWith("$P$") && !storedHash?.startsWith("$H$")) {
      return new Response(JSON.stringify({ error: "Invalid login credentials" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const valid = await verifyPhpass(password, storedHash);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid login credentials" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password });
    if (updateError) console.error("[wp-password-login] Hash upgrade failed:", updateError);
    return new Response(JSON.stringify({ upgraded: !updateError }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[wp-password-login] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
