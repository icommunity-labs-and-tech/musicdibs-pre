// HMAC signature for provider callback URLs (KIE). The signature binds the
// callback to a specific record id, so an outside caller cannot target
// arbitrary records by guessing/choosing an id.
const encoder = new TextEncoder();

function secret(): string {
  const s = Deno.env.get("CALLBACK_SIGNING_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!s) throw new Error("Missing callback signing secret");
  return s;
}

export async function signCallback(kind: string, id: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`${kind}:${id}`));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyCallback(kind: string, id: string, sig: string | null): Promise<boolean> {
  if (!sig) return false;
  const expected = await signCallback(kind, id);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}
