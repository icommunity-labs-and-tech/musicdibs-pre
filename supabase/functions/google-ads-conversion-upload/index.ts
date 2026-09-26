// google-ads-conversion-upload
// Envia a Google Ads, como conversiones offline de clic, las compras de Stripe
// (tabla orders) que traen gclid / gbraid / wbraid en metadata.
//
// Flujo (lo lanza pg_cron cada 15 min con x-cron-secret):
//   1. Encola en google_ads_conversion_uploads las orders pagadas (no renovaciones,
//      importe > 0, ultimos 60 dias) con click id que aun no esten en la cola.
//   2. Sube las pendientes a customers/{id}:uploadClickConversions (partialFailure).
//   3. Marca uploaded / failed (reintenta hasta 5 veces).
//
// Secrets necesarios (si falta alguno, encola pero no sube):
//   GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET,
//   GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_CUSTOMER_ID (sin guiones),
//   GOOGLE_ADS_CONVERSION_ACTION_ID (accion tipo "Importacion > clics").
// Opcionales: GOOGLE_ADS_LOGIN_CUSTOMER_ID (MCC), GOOGLE_ADS_API_VERSION (def. v25).
//
// Body opcional: { "dry_run": true } -> encola y valida contra la API con
// validateOnly=true (no registra conversiones).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const MAX_ATTEMPTS = 5;
const LOOKBACK_DAYS = 60; // Google acepta clics de hasta 90 dias
const BATCH = 200;

type Pending = {
  order_id: string;
  click_id_type: "gclid" | "gbraid" | "wbraid";
  click_id: string;
  conversion_value: number;
  currency: string;
  conversion_time: string;
  attempts: number;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

// Google exige "yyyy-mm-dd hh:mm:ss+00:00"
function gadsDate(iso: string) {
  return new Date(iso).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "+00:00");
}

function pickClickId(meta: Record<string, unknown> | null) {
  if (!meta) return null;
  for (const k of ["gclid", "gbraid", "wbraid"] as const) {
    const v = meta[k];
    if (typeof v === "string" && v.trim()) return { type: k, id: v.trim() };
  }
  return null;
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
    .select("id, amount_net, amount_gross, currency, paid_at, metadata")
    .eq("order_status", "paid")
    .eq("is_renewal", false)
    .gte("paid_at", since)
    .not("metadata", "is", null)
    .limit(2000);
  if (oErr) return json({ error: `orders query: ${oErr.message}` }, 500);

  const candidates = (orders || [])
    .map((o: any) => ({ o, click: pickClickId(o.metadata) }))
    .filter((x: any) => x.click && Number(x.o.amount_net ?? x.o.amount_gross) > 0);

  if (candidates.length) {
    const ids = candidates.map((c: any) => c.o.id);
    const { data: existing } = await supabase.from("google_ads_conversion_uploads").select("order_id").in("order_id", ids);
    const seen = new Set((existing || []).map((e: any) => e.order_id));
    const rows = candidates.filter((c: any) => !seen.has(c.o.id)).map((c: any) => ({
      order_id: c.o.id,
      click_id_type: c.click.type,
      click_id: c.click.id,
      conversion_value: Number(c.o.amount_net ?? c.o.amount_gross),
      currency: String(c.o.currency || "eur").toUpperCase(),
      conversion_time: c.o.paid_at,
    }));
    if (rows.length) {
      const { error } = await supabase.from("google_ads_conversion_uploads").upsert(rows, { onConflict: "order_id", ignoreDuplicates: true });
      if (error) result.errors.push(`enqueue: ${error.message}`);
      else result.enqueued = rows.length;
    }
  }

  // 2. Subir
  const required = ["GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET",
    "GOOGLE_ADS_REFRESH_TOKEN", "GOOGLE_ADS_CUSTOMER_ID", "GOOGLE_ADS_CONVERSION_ACTION_ID"];
  const missing = required.filter((k) => !Deno.env.get(k));
  if (missing.length) {
    result.skipped_reason = `missing secrets: ${missing.join(", ")}`;
    return json({ success: true, dry_run: dryRun, ...result });
  }

  const { data: pending, error: pErr } = await supabase
    .from("google_ads_conversion_uploads")
    .select("order_id, click_id_type, click_id, conversion_value, currency, conversion_time, attempts")
    .in("status", ["pending", "failed"])
    .lt("attempts", MAX_ATTEMPTS)
    .order("conversion_time", { ascending: true })
    .limit(BATCH);
  if (pErr) return json({ error: `pending query: ${pErr.message}` }, 500);
  if (!pending?.length) return json({ success: true, dry_run: dryRun, ...result });

  const customerId = Deno.env.get("GOOGLE_ADS_CUSTOMER_ID")!.replace(/-/g, "");
  const actionId = Deno.env.get("GOOGLE_ADS_CONVERSION_ACTION_ID")!;
  const version = Deno.env.get("GOOGLE_ADS_API_VERSION") || "v25";
  const loginCustomer = Deno.env.get("GOOGLE_ADS_LOGIN_CUSTOMER_ID")?.replace(/-/g, "");

  const conversions = (pending as Pending[]).map((p) => ({
    [p.click_id_type]: p.click_id,
    conversionAction: `customers/${customerId}/conversionActions/${actionId}`,
    conversionDateTime: gadsDate(p.conversion_time),
    conversionValue: Number(p.conversion_value),
    currencyCode: p.currency,
    orderId: p.order_id, // deduplicacion en Google
  }));

  let resp: any;
  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "developer-token": Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN")!,
      "Content-Type": "application/json",
    };
    if (loginCustomer) headers["login-customer-id"] = loginCustomer;
    const r = await fetch(`https://googleads.googleapis.com/${version}/customers/${customerId}:uploadClickConversions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ conversions, partialFailure: true, validateOnly: dryRun }),
    });
    resp = await r.json();
    if (!r.ok) throw new Error(`Google Ads ${r.status}: ${JSON.stringify(resp).slice(0, 1000)}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    result.errors.push(msg);
    if (!dryRun) {
      for (const p of pending as Pending[]) {
        await supabase.from("google_ads_conversion_uploads")
          .update({ status: "failed", attempts: p.attempts + 1, last_error: msg.slice(0, 1000) })
          .eq("order_id", p.order_id);
      }
    }
    return json({ success: false, dry_run: dryRun, ...result }, 502);
  }

  // Errores parciales: details[].errors[].location.fieldPathElements -> index de conversions
  const failedIdx = new Map<number, string>();
  for (const d of resp?.partialFailureError?.details || []) {
    for (const err of d?.errors || []) {
      const idx = (err?.location?.fieldPathElements || []).find((f: any) => f.fieldName === "conversions")?.index;
      if (typeof idx === "number") failedIdx.set(idx, `${JSON.stringify(err.errorCode)} ${err.message || ""}`.slice(0, 1000));
    }
  }
  if (resp?.partialFailureError && failedIdx.size === 0) {
    result.errors.push(`partialFailure sin indices: ${JSON.stringify(resp.partialFailureError).slice(0, 500)}`);
  }

  if (dryRun) {
    return json({ success: true, dry_run: true, would_upload: pending.length - failedIdx.size, validation_errors: Object.fromEntries(failedIdx), ...result });
  }

  const now = new Date().toISOString();
  for (let i = 0; i < pending.length; i++) {
    const p = (pending as Pending[])[i];
    const err = failedIdx.get(i);
    if (err) {
      result.failed++;
      await supabase.from("google_ads_conversion_uploads")
        .update({ status: "failed", attempts: p.attempts + 1, last_error: err })
        .eq("order_id", p.order_id);
    } else {
      result.uploaded++;
      await supabase.from("google_ads_conversion_uploads")
        .update({ status: "uploaded", attempts: p.attempts + 1, last_error: null, uploaded_at: now })
        .eq("order_id", p.order_id);
    }
  }

  return json({ success: true, dry_run: false, ...result });
});
