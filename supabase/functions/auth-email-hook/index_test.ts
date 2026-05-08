// Tests para auth-email-hook
// Cubre: rechazo sin firma, lógica de routing del destinatario para email_change_*,
// normalización del verifyType y allowlist de eventos.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? "https://kmwehyixenybegwhqljx.supabase.co";
const HOOK_URL = `${SUPABASE_URL}/functions/v1/auth-email-hook`;

// --------- Replica de la lógica del Edge Function (mantener en sincronía) ---------
type TestPayload = {
  user?: { email?: string; new_email?: string };
  email_data?: {
    email_action_type?: string;
    token?: string;
    token_hash?: string;
    token_new?: string;
    token_hash_new?: string;
  };
};

function buildEmailQueue(body: TestPayload) {
  const emailType = body.email_data?.email_action_type;
  const currentEmail = body.user?.email;
  const newEmail = body.user?.new_email;
  const token = body.email_data?.token ?? "";
  const tokenHash = body.email_data?.token_hash ?? "";
  const tokenNew = body.email_data?.token_new ?? "";
  const tokenHashNew = body.email_data?.token_hash_new ?? "";

  if (!emailType) return [];
  if (emailType === "email_change") {
    const emails = [];
    if (currentEmail && tokenHashNew) emails.push({ type: "email_change_current", recipient: currentEmail, token, tokenHash: tokenHashNew });
    if (newEmail && tokenHash) emails.push({ type: "email_change_new", recipient: newEmail, token: tokenNew || token, tokenHash });
    return emails;
  }

  const recipient = emailType === "email_change_new" ? (newEmail || currentEmail) : currentEmail;
  return recipient && tokenHash ? [{ type: emailType, recipient, token, tokenHash }] : [];
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
Deno.test("email_change seguro: genera correo actual con token_hash_new y correo nuevo con token_hash", () => {
  const emails = buildEmailQueue({
    user: { email: "old@x.com", new_email: "new@x.com" },
    email_data: {
      email_action_type: "email_change",
      token: "111111",
      token_hash_new: "hash_current",
      token_new: "222222",
      token_hash: "hash_new",
    },
  });

  assertEquals(emails, [
    { type: "email_change_current", recipient: "old@x.com", token: "111111", tokenHash: "hash_current" },
    { type: "email_change_new", recipient: "new@x.com", token: "222222", tokenHash: "hash_new" },
  ]);
});

Deno.test("email_change sin secure change: genera correo al nuevo email", () => {
  const emails = buildEmailQueue({
    user: { email: "old@x.com", new_email: "new@x.com" },
    email_data: { email_action_type: "email_change", token: "111111", token_hash: "hash_new" },
  });

  assertEquals(emails, [
    { type: "email_change_new", recipient: "new@x.com", token: "111111", tokenHash: "hash_new" },
  ]);
});

Deno.test("recipient: variante explícita email_change_new → nuevo email", () => {
  const emails = buildEmailQueue({
    user: { email: "old@x.com", new_email: "new@x.com" },
    email_data: { email_action_type: "email_change_new", token: "111111", token_hash: "hash_new" },
  });

  assertEquals(emails[0].recipient, "new@x.com");
});

Deno.test("recipient: variante explícita email_change_current → email actual", () => {
  const emails = buildEmailQueue({
    user: { email: "old@x.com", new_email: "new@x.com" },
    email_data: { email_action_type: "email_change_current", token: "111111", token_hash: "hash_current" },
  });

  assertEquals(emails[0].recipient, "old@x.com");
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
