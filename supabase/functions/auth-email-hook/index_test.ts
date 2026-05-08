// Tests para auth-email-hook
// Cubre: rechazo sin firma, lógica de routing del destinatario para email_change_*,
// normalización del verifyType y allowlist de eventos.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? "https://kmwehyixenybegwhqljx.supabase.co";
const HOOK_URL = `${SUPABASE_URL}/functions/v1/auth-email-hook`;

// --------- Replica de la lógica del Edge Function (mantener en sincronía) ---------
function resolveRecipient(emailType: string, currentEmail: string, newEmail?: string): string {
  return emailType === "email_change_new" ? (newEmail || currentEmail) : currentEmail;
}
function resolveVerifyType(emailType: string): string {
  return emailType.startsWith("email_change") ? "email_change" : emailType;
}
const ALLOWED_TYPES = new Set([
  "signup", "magiclink", "recovery", "invite",
  "email_change", "email_change_current", "email_change_new",
  "reauthentication",
]);

// --------- Tests E2E contra el endpoint desplegado ---------
Deno.test("E2E: rechaza POST sin firma con 401", async () => {
  const res = await fetch(HOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true }),
  });
  await res.text();
  assertEquals(res.status, 401);
});

Deno.test("E2E: responde a OPTIONS con CORS", async () => {
  const res = await fetch(HOOK_URL, { method: "OPTIONS" });
  await res.text();
  // Debe permitir el preflight (200/204 sin error)
  assert(res.status === 200 || res.status === 204, `Unexpected status ${res.status}`);
});

// --------- Tests unitarios de la lógica de routing ---------
Deno.test("recipient: email_change_new → nuevo email", () => {
  assertEquals(
    resolveRecipient("email_change_new", "old@x.com", "new@x.com"),
    "new@x.com",
  );
});

Deno.test("recipient: email_change_current → email actual", () => {
  assertEquals(
    resolveRecipient("email_change_current", "old@x.com", "new@x.com"),
    "old@x.com",
  );
});

Deno.test("recipient: email_change (legacy) → email actual", () => {
  assertEquals(
    resolveRecipient("email_change", "old@x.com", "new@x.com"),
    "old@x.com",
  );
});

Deno.test("recipient: email_change_new sin new_email cae a email actual", () => {
  assertEquals(
    resolveRecipient("email_change_new", "old@x.com", undefined),
    "old@x.com",
  );
});

// --------- Tests de la URL de verificación ---------
Deno.test("verifyType: ambas variantes email_change_* normalizan a email_change", () => {
  assertEquals(resolveVerifyType("email_change_current"), "email_change");
  assertEquals(resolveVerifyType("email_change_new"), "email_change");
  assertEquals(resolveVerifyType("email_change"), "email_change");
});

Deno.test("verifyType: otros tipos no se modifican", () => {
  assertEquals(resolveVerifyType("signup"), "signup");
  assertEquals(resolveVerifyType("recovery"), "recovery");
  assertEquals(resolveVerifyType("magiclink"), "magiclink");
});

Deno.test("verifyType: la URL de Supabase /verify usa type=email_change para ambos", () => {
  const baseUrl = "https://kmwehyixenybegwhqljx.supabase.co";
  const tokenHash = "hash_abc";
  const redirect = "https://musicdibs.com/dashboard/profile";
  for (const t of ["email_change_current", "email_change_new"]) {
    const verifyType = resolveVerifyType(t);
    const url = `${baseUrl}/auth/v1/verify?token=${tokenHash}&type=${verifyType}&redirect_to=${encodeURIComponent(redirect)}`;
    assert(url.includes("type=email_change"), `URL mal construida para ${t}: ${url}`);
    assert(!url.includes("type=email_change_current"), `No debe filtrar variante: ${url}`);
    assert(!url.includes("type=email_change_new"), `No debe filtrar variante: ${url}`);
  }
});

// --------- Tests del allowlist ---------
Deno.test("allowlist incluye email_change_current y email_change_new", () => {
  assert(ALLOWED_TYPES.has("email_change_current"));
  assert(ALLOWED_TYPES.has("email_change_new"));
  assert(ALLOWED_TYPES.has("email_change"));
});

Deno.test("allowlist excluye tipos no transaccionales", () => {
  assert(!ALLOWED_TYPES.has("garbage_type"));
  assert(!ALLOWED_TYPES.has("marketing"));
});
