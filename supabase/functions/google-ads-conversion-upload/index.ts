// google-ads-conversion-upload
// Envia a Google Ads las compras de Stripe (tabla orders) como conversiones
// offline, via Data Manager API (events:ingest). Google obliga a usar esta API
// para integraciones nuevas: ConversionUploadService.UploadClickConversions
// devuelve CUSTOMER_NOT_ALLOWLISTED_FOR_THIS_FEATURE.
//
// Que se envia:
//   - orders pagadas (no renovaciones, importe > 0, ultimos 60 dias) con
//     gclid / gbraid / wbraid en metadata;
//   - desde ENHANCED_LEADS_START, tambien las que solo tienen email
//     (conversiones mejoradas para leads, email SHA-256 hex).
//   El email cifrado NO se envia para compradores del EEE, Reino Unido o Suiza
//   (el backend no conoce su consentimiento publicitario); para ellos solo va
//   el identificador de clic.
//
// Flujo (lo lanza pg_cron cada 15 min con x-cron-secret):
//   1. Encola en google_ads_conversion_uploads las orders nuevas.
//   2. Sube las pendientes en lote a datamanager.googleapis.com/v1/events:ingest.
//      Si el lote entero falla con 4xx, reintenta evento a evento para aislar
//      el que falla.
//   3. Marca uploaded / failed (hasta 5 intentos).
//
// Secrets necesarios (si falta alguno, encola pero no sube):
//   GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET,
//   GOOGLE_ADS_REFRESH_TOKEN (con el scope https://www.googleapis.com/auth/datamanager),
//   GOOGLE_ADS_CUSTOMER_ID (sin guiones),
//   GOOGLE_ADS_CONVERSION_ACTION_ID (accion "Importacion > clics"; es el
//   productDestinationId de Data Manager).
// Opcional: GOOGLE_ADS_LOGIN_CUSTOMER_ID (MCC, si se accede a traves de el).
// Requisito en Google Cloud: API "Data Manager API" activada en el proyecto
// del client ID.
//
// Body opcional: { "dry_run": true } -> encola y valida con validateOnly=true
// (no registra conversiones ni cambia el estado de la cola).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const MAX_ATTEMPTS = 5;
const LOOKBACK_DAYS = 60;
const BATCH = 200;
const ENHANCED_LEADS_START = "2026-09-26T20:30:00Z";
const INGEST_URL = "https://datamanager.googleapis.com/v1/events:ingest";
// Errores que no se arreglan reintentando.
const PERMANENT_ERROR = /NOT_ALLOWLISTED|CUSTOMER_DATA_TERMS|CUSTOMER_DATA_POLICY|INVALID_ARGUMENT/i;
// EEE + Reino Unido + Suiza: sin email cifrado (solo click id).
const CONSENT_REGION = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT",
  "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO", "GB", "CH",
]);

type Pending = {
  order_id: string;
  click_id_type: "gclid" | "gbraid" | "wbraid" | null;
  click_id: string | null;
  hashed_email: string | null;
  conversion_value: number;
  currency: string;
  conversion_time: string;
  attempts: number;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function pickClickId(meta: Record<string, unknown> | null) {
  if (!meta) return null;
  for (const k of ["gclid", "gbraid", "wbraid"] as const) {
    const v = meta[k];
    if (typeof v === "string" && v.trim()) return { type: k, id: v.trim() };
  }
  return null;
}

// trim + minusculas; sin puntos en la parte local de gmail.com / googlemail.com -> SHA-256 hex.
async function hashEmail(raw: string | null | undefined): Promise<string | null> {
  if (!raw) return null;
  let email = raw.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") email = `${local.replace(/\./g, "")}@${domain}`;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: Deno.env.get("GOOGLE_ADS_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_ADS_CLIENT_SECRET")!,
      refresh_token: Deno.env.get("GOOGLE_ADS_REFRESH_TOKEN")!,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error(`OAuth error: ${JSON.stringify(data).slice(0, 500)}`);
  return data.access_token as string;
}

function toEvent(p: Pending) {
  const ev: Record<string, unknown> = {
    eventTimestamp: new Date(p.conversion_time).toISOString(),
    transactionId: p.order_id, // deduplicacion en Google
    eventSource: "WEB",
    conversionValue: Number(p.conversion_value),
    currency: p.currency,
  };
  if (p.click_id_type && p.click_id) ev.adIdentifiers = { [p.click_id_type]: p.click_id };
  if (p.hashed_email) ev.userData = { userIdentifiers: [{ emailAddress: p.hashed_email }] };
  return ev;
}

Deno.serve(async (req) => {
  const envSecret = Deno.env.get("CRON_SECRET") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const authHeader = req.headers.get("Authorization") || "";
  const cronHeader = req.headers.get("x-cron-secret") || "";
  const ok = (!!envSecret && (cronHeader === envSecret || authHeader === `Bearer ${envSecret}`)) ||
    authHeader === `Bearer ${serviceKey}`;
  if (!ok) return json({ error: "Unauthorized" }, 401);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch (_) { /* sin body */ }
  const dryRun = body.dry_run === true;

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, { auth: { persistSession: false } });
  const result = { enqueued: 0, uploaded: 0, failed: 0, skipped_reason: null as string | null, errors: [] as string[] };

  // 1. Encolar
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400_000).toISOString();
  const { data: orders, error: oErr } = await supabase
    .from("orders")
    .select("id, user_id, customer_email, country, amount_net, amount_gross, currency, paid_at, metadata")
    .eq("order_status", "paid")
    .eq("is_renewal", false)
    .gte("paid_at", since)
    .limit(2000);
  if (oErr) return json({ error: `orders query: ${oErr.message}` }, 500);

  const candidates = (orders || [])
    .map((o: any) => ({ o, click: pickClickId(o.metadata) }))
    .filter((x: any) => Number(x.o.amount_net ?? x.o.amount_gross) > 0)
    .filter((x: any) => x.click || (x.o.paid_at > ENHANCED_LEADS_START && (x.o.customer_email || x.o.user_id)));

  if (candidates.length) {
    const ids = candidates.map((c: any) => c.o.id);
    const { data: existing } = await supabase.from("google_ads_conversion_uploads").select("order_id").in("order_id", ids);
    const seen = new Set((existing || []).map((e: any) => e.order_id));
    const rows: Record<string, unknown>[] = [];
    for (const c of candidates.filter((c: any) => !seen.has(c.o.id)) as any[]) {
      const country = String(c.o.country || "").toUpperCase();
      let hashed_email: string | null = null;
      if (!CONSENT_REGION.has(country)) {
        let email: string | null = c.o.customer_email || null;
        if (!email && c.o.user_id) {
          const { data: u } = await supabase.auth.admin.getUserById(c.o.user_id);
          email = u?.user?.email || null;
        }
        hashed_email = await hashEmail(email);
      }
      if (!c.click && !hashed_email) continue;
      rows.push({
        order_id: c.o.id,
        click_id_type: c.click?.type ?? null,
        click_id: c.click?.id ?? null,
        hashed_email,
        conversion_value: Number(c.o.amount_net ?? c.o.amount_gross),
        currency: String(c.o.currency || "eur").toUpperCase(),
        conversion_time: c.o.paid_at,
      });
    }
    if (rows.length) {
      const { error } = await supabase.from("google_ads_conversion_uploads").upsert(rows, { onConflict: "order_id", ignoreDuplicates: true });
      if (error) result.errors.push(`enqueue: ${error.message}`);
      else result.enqueued = rows.length;
    }
  }

  // 2. Subir
  const required = ["GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET", "GOOGLE_ADS_REFRESH_TOKEN",
    "GOOGLE_ADS_CUSTOMER_ID", "GOOGLE_ADS_CONVERSION_ACTION_ID"];
  const missing = required.filter((k) => !Deno.env.get(k));
  if (missing.length) {
    result.skipped_reason = `missing secrets: ${missing.join(", ")}`;
    return json({ success: true, dry_run: dryRun, ...result });
  }

  const { data: pending, error: pErr } = await supabase
    .from("google_ads_conversion_uploads")
    .select("order_id, click_id_type, click_id, hashed_email, conversion_value, currency, conversion_time, attempts")
    .in("status", ["pending", "failed"])
    .lt("attempts", MAX_ATTEMPTS)
    .order("conversion_time", { ascending: true })
    .limit(BATCH);
  if (pErr) return json({ error: `pending query: ${pErr.message}` }, 500);
  if (!pending?.length) return json({ success: true, dry_run: dryRun, ...result });

  const customerId = Deno.env.get("GOOGLE_ADS_CUSTOMER_ID")!.replace(/-/g, "");
  const actionId = Deno.env.get("GOOGLE_ADS_CONVERSION_ACTION_ID")!;
  const loginCustomer = Deno.env.get("GOOGLE_ADS_LOGIN_CUSTOMER_ID")?.replace(/-/g, "");
  const destination: Record<string, unknown> = {
    operatingAccount: { accountType: "GOOGLE_ADS", accountId: customerId },
    productDestinationId: actionId,
  };
  if (loginCustomer) destination.loginAccount = { accountType: "GOOGLE_ADS", accountId: loginCustomer };

  let token: string;
  try {
    token = await getAccessToken();
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : String(e));
    return json({ success: false, dry_run: dryRun, ...result }, 502);
  }

  async function ingest(items: Pending[]): Promise<{ ok: boolean; status: number; error?: string; warnings?: unknown }> {
    const r = await fetch(INGEST_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ destinations: [destination], encoding: "HEX", events: items.map(toEvent), validateOnly: dryRun }),
    });
    const text = await r.text();
    if (r.ok) {
      let warnings: unknown;
      try { warnings = JSON.parse(text)?.fieldWarnings; } catch (_) { /* vacio */ }
      return { ok: true, status: r.status, warnings };
    }
    return { ok: false, status: r.status, error: `Data Manager ${r.status}: ${text.slice(0, 1000)}` };
  }

  const items = pending as Pending[];
  const outcome = new Map<string, string | null>(); // order_id -> error | null (ok)
  const warnings: unknown[] = [];

  const batchRes = await ingest(items);
  if (batchRes.ok) {
    items.forEach((p) => outcome.set(p.order_id, null));
    if (batchRes.warnings) warnings.push(batchRes.warnings);
  } else if (batchRes.status >= 400 && batchRes.status < 500 && items.length > 1 && batchRes.status !== 401 && batchRes.status !== 403) {
    // Aislar eventos invalidos: reintento uno a uno.
    for (const p of items) {
      const one = await ingest([p]);
      outcome.set(p.order_id, one.ok ? null : one.error!);
      if (one.warnings) warnings.push(one.warnings);
    }
  } else {
    items.forEach((p) => outcome.set(p.order_id, batchRes.error!));
  }

  const errorsByOrder = Object.fromEntries([...outcome].filter(([, e]) => e));
  if (dryRun) {
    const firstErr = Object.values(errorsByOrder)[0];
    if (firstErr) result.errors.push(String(firstErr));
    return json({
      success: Object.keys(errorsByOrder).length === 0,
      dry_run: true,
      would_upload: items.length - Object.keys(errorsByOrder).length,
      failed_orders: Object.keys(errorsByOrder).length,
      field_warnings: warnings,
      ...result,
    });
  }

  const now = new Date().toISOString();
  for (const p of items) {
    const err = outcome.get(p.order_id);
    if (err) {
      result.failed++;
      await supabase.from("google_ads_conversion_uploads")
        .update({ status: "failed", attempts: PERMANENT_ERROR.test(err) ? MAX_ATTEMPTS : p.attempts + 1, last_error: err.slice(0, 1000) })
        .eq("order_id", p.order_id);
    } else {
      result.uploaded++;
      await supabase.from("google_ads_conversion_uploads")
        .update({ status: "uploaded", attempts: p.attempts + 1, last_error: null, uploaded_at: now })
        .eq("order_id", p.order_id);
    }
  }
  if (result.failed) result.errors.push(String(Object.values(errorsByOrder)[0]).slice(0, 500));

  return json({ success: result.failed === 0, dry_run: false, field_warnings: warnings, ...result });
});
