import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ITOA64 = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

// ─── Sync MD5 implementation (PHPass needs ≥2^11 sequential iterations,
//     async crypto.subtle.digest would be too slow & awkward) ──────────
function md5Bytes(input: Uint8Array): Uint8Array {
  function add32(a: number, b: number) {
    return (a + b) & 0xffffffff;
  }
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    const n = add32(add32(a, q), add32(x, t));
    return add32((n << s) | (n >>> (32 - s)), b);
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  // Convert bytes to 32-bit words (little-endian) with MD5 padding
  const len = input.length;
  const bitLen = len * 8;
  const padLen = (((len + 8) >>> 6) + 1) << 6; // total padded byte length (multiple of 64)
  const padded = new Uint8Array(padLen);
  padded.set(input);
  padded[len] = 0x80;
  // append length as 64-bit little-endian (we only fill low 32 bits)
  padded[padLen - 8] = bitLen & 0xff;
  padded[padLen - 7] = (bitLen >>> 8) & 0xff;
  padded[padLen - 6] = (bitLen >>> 16) & 0xff;
  padded[padLen - 5] = (bitLen >>> 24) & 0xff;

  const numWords = padLen / 4;
  const x = new Int32Array(numWords);
  for (let i = 0; i < numWords; i++) {
    x[i] =
      padded[i * 4] |
      (padded[i * 4 + 1] << 8) |
      (padded[i * 4 + 2] << 16) |
      (padded[i * 4 + 3] << 24);
  }

  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;

  for (let i = 0; i < x.length; i += 16) {
    const olda = a, oldb = b, oldc = c, oldd = d;
    a = ff(a, b, c, d, x[i + 0], 7, -680876936);
    d = ff(d, a, b, c, x[i + 1], 12, -389564586);
    c = ff(c, d, a, b, x[i + 2], 17, 606105819);
    b = ff(b, c, d, a, x[i + 3], 22, -1044525330);
    a = ff(a, b, c, d, x[i + 4], 7, -176418897);
    d = ff(d, a, b, c, x[i + 5], 12, 1200080426);
    c = ff(c, d, a, b, x[i + 6], 17, -1473231341);
    b = ff(b, c, d, a, x[i + 7], 22, -45705983);
    a = ff(a, b, c, d, x[i + 8], 7, 1770035416);
    d = ff(d, a, b, c, x[i + 9], 12, -1958414417);
    c = ff(c, d, a, b, x[i + 10], 17, -42063);
    b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
    a = ff(a, b, c, d, x[i + 12], 7, 1804603682);
    d = ff(d, a, b, c, x[i + 13], 12, -40341101);
    c = ff(c, d, a, b, x[i + 14], 17, -1502002290);
    b = ff(b, c, d, a, x[i + 15], 22, 1236535329);

    a = gg(a, b, c, d, x[i + 1], 5, -165796510);
    d = gg(d, a, b, c, x[i + 6], 9, -1069501632);
    c = gg(c, d, a, b, x[i + 11], 14, 643717713);
    b = gg(b, c, d, a, x[i + 0], 20, -373897302);
    a = gg(a, b, c, d, x[i + 5], 5, -701558691);
    d = gg(d, a, b, c, x[i + 10], 9, 38016083);
    c = gg(c, d, a, b, x[i + 15], 14, -660478335);
    b = gg(b, c, d, a, x[i + 4], 20, -405537848);
    a = gg(a, b, c, d, x[i + 9], 5, 568446438);
    d = gg(d, a, b, c, x[i + 14], 9, -1019803690);
    c = gg(c, d, a, b, x[i + 3], 14, -187363961);
    b = gg(b, c, d, a, x[i + 8], 20, 1163531501);
    a = gg(a, b, c, d, x[i + 13], 5, -1444681467);
    d = gg(d, a, b, c, x[i + 2], 9, -51403784);
    c = gg(c, d, a, b, x[i + 7], 14, 1735328473);
    b = gg(b, c, d, a, x[i + 12], 20, -1926607734);

    a = hh(a, b, c, d, x[i + 5], 4, -378558);
    d = hh(d, a, b, c, x[i + 8], 11, -2022574463);
    c = hh(c, d, a, b, x[i + 11], 16, 1839030562);
    b = hh(b, c, d, a, x[i + 14], 23, -35309556);
    a = hh(a, b, c, d, x[i + 1], 4, -1530992060);
    d = hh(d, a, b, c, x[i + 4], 11, 1272893353);
    c = hh(c, d, a, b, x[i + 7], 16, -155497632);
    b = hh(b, c, d, a, x[i + 10], 23, -1094730640);
    a = hh(a, b, c, d, x[i + 13], 4, 681279174);
    d = hh(d, a, b, c, x[i + 0], 11, -358537222);
    c = hh(c, d, a, b, x[i + 3], 16, -722521979);
    b = hh(b, c, d, a, x[i + 6], 23, 76029189);
    a = hh(a, b, c, d, x[i + 9], 4, -640364487);
    d = hh(d, a, b, c, x[i + 12], 11, -421815835);
    c = hh(c, d, a, b, x[i + 15], 16, 530742520);
    b = hh(b, c, d, a, x[i + 2], 23, -995338651);

    a = ii(a, b, c, d, x[i + 0], 6, -198630844);
    d = ii(d, a, b, c, x[i + 7], 10, 1126891415);
    c = ii(c, d, a, b, x[i + 14], 15, -1416354905);
    b = ii(b, c, d, a, x[i + 5], 21, -57434055);
    a = ii(a, b, c, d, x[i + 12], 6, 1700485571);
    d = ii(d, a, b, c, x[i + 3], 10, -1894986606);
    c = ii(c, d, a, b, x[i + 10], 15, -1051523);
    b = ii(b, c, d, a, x[i + 1], 21, -2054922799);
    a = ii(a, b, c, d, x[i + 8], 6, 1873313359);
    d = ii(d, a, b, c, x[i + 15], 10, -30611744);
    c = ii(c, d, a, b, x[i + 6], 15, -1560198380);
    b = ii(b, c, d, a, x[i + 13], 21, 1309151649);
    a = ii(a, b, c, d, x[i + 4], 6, -145523070);
    d = ii(d, a, b, c, x[i + 11], 10, -1120210379);
    c = ii(c, d, a, b, x[i + 2], 15, 718787259);
    b = ii(b, c, d, a, x[i + 9], 21, -343485551);

    a = add32(a, olda);
    b = add32(b, oldb);
    c = add32(c, oldc);
    d = add32(d, oldd);
  }

  const out = new Uint8Array(16);
  [a, b, c, d].forEach((val, idx) => {
    out[idx * 4] = val & 0xff;
    out[idx * 4 + 1] = (val >>> 8) & 0xff;
    out[idx * 4 + 2] = (val >>> 16) & 0xff;
    out[idx * 4 + 3] = (val >>> 24) & 0xff;
  });
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

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function verifyPhpass(password: string, storedHash: string): boolean {
  if (!storedHash.startsWith("$P$") && !storedHash.startsWith("$H$")) return false;

  const iterChar = storedHash[3];
  const iterCount = ITOA64.indexOf(iterChar);
  if (iterCount < 0) return false;
  const iterations = 1 << iterCount;

  const salt = storedHash.substring(4, 12);
  if (salt.length !== 8) return false;

  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);
  const saltBytes = encoder.encode(salt);

  let hash = md5Bytes(concatBytes(saltBytes, passwordBytes));
  for (let i = 0; i < iterations; i++) {
    hash = md5Bytes(concatBytes(hash, passwordBytes));
  }

  const encoded = phpassEncode64(hash, 16);
  const expected = storedHash.substring(12, 12 + encoded.length);
  const match = encoded === expected;

  console.error('[wp-password-login] PHPass debug:', {
    salt,
    saltLen: salt.length,
    iterations,
    encodedResult: encoded,
    expectedHash: expected,
    match,
  });

  return match;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Use SQL function to get user_id + hash in one query (scales to any number of users)
    const { data: authData, error: authError } = await supabaseAdmin
      .rpc("get_user_auth_data", { user_email: String(email).toLowerCase() });

    if (authError || !authData || authData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid login credentials" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { user_id, hash: storedHash } = authData[0];

    // Only process PHPass hashes — bcrypt users should use native Supabase auth
    if (!storedHash?.startsWith("$P$") && !storedHash?.startsWith("$H$")) {
      return new Response(
        JSON.stringify({ error: "Invalid login credentials" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify PHPass password
    if (!verifyPhpass(password, storedHash)) {
      return new Response(
        JSON.stringify({ error: "Invalid login credentials" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Password valid — upgrade hash to bcrypt so future logins use native Supabase auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password },
    );

    if (updateError) {
      console.error("[wp-password-login] Hash upgrade failed:", updateError);
      // Continue — login will still work, hash stays PHPass until next attempt
    }

    return new Response(
      JSON.stringify({ upgraded: !updateError }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[wp-password-login] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
