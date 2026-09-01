import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ── Google service account auth ───────────────────────────────────────
function b64url(input: ArrayBuffer | string) {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : new Uint8Array(input);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToPkcs8(pem: string) {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const raw = atob(body);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(sa: { client_email: string; private_key: string }) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp > now + 60) return cachedToken.token;

  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(sa.private_key.replace(/\\n/g, "\n")),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${claim}`),
  );
  const jwt = `${header}.${claim}.${b64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google token [${res.status}]: ${JSON.stringify(data)}`);
  cachedToken = { token: data.access_token, exp: now + (data.expires_in ?? 3600) };
  return cachedToken.token;
}

// ── GA4 Data API ──────────────────────────────────────────────────────
async function runReport(token: string, propertyId: string, body: unknown) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`GA4 runReport [${res.status}]: ${JSON.stringify(data)}`);
  return data;
}

async function runRealtime(token: string, propertyId: string, body: unknown) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`GA4 realtime [${res.status}]: ${JSON.stringify(data)}`);
  return data;
}

const rows = (r: any) =>
  (r?.rows ?? []).map((row: any) => ({
    keys: (row.dimensionValues ?? []).map((d: any) => d.value),
    values: (row.metricValues ?? []).map((m: any) => Number(m.value) || 0),
  }));

const dim = (name: string) => ({ name });
const met = (name: string) => ({ name });

function dateRange(days: number, offset = 0) {
  return {
    startDate: `${days + offset}daysAgo`,
    endDate: offset ? `${offset}daysAgo` : "today",
  };
}

async function buildGa4(propertyId: string, token: string, days: number) {
  const range = dateRange(days);
  const prevRange = dateRange(days, days);

  const totalsMetrics = [
    "activeUsers",
    "newUsers",
    "sessions",
    "screenPageViews",
    "engagementRate",
    "averageSessionDuration",
    "bounceRate",
    "conversions",
  ].map(met);

  const [
    totals,
    prevTotals,
    series,
    countries,
    languages,
    sources,
    devices,
    pages,
    landings,
    events,
    realtime,
  ] = await Promise.all([
    runReport(token, propertyId, { dateRanges: [range], metrics: totalsMetrics }),
    runReport(token, propertyId, { dateRanges: [prevRange], metrics: totalsMetrics }),
    runReport(token, propertyId, {
      dateRanges: [range],
      dimensions: [dim("date")],
      metrics: [met("activeUsers"), met("sessions"), met("screenPageViews")],
      orderBys: [{ dimension: { dimensionName: "date" } }],
      limit: 400,
    }),
    runReport(token, propertyId, {
      dateRanges: [range],
      dimensions: [dim("country"), dim("countryId")],
      metrics: [met("activeUsers"), met("sessions"), met("engagementRate")],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: 20,
    }),
    runReport(token, propertyId, {
      dateRanges: [range],
      dimensions: [dim("language")],
      metrics: [met("activeUsers"), met("sessions")],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: 15,
    }),
    runReport(token, propertyId, {
      dateRanges: [range],
      dimensions: [dim("sessionSourceMedium"), dim("sessionDefaultChannelGroup")],
      metrics: [met("sessions"), met("activeUsers"), met("conversions")],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 20,
    }),
    runReport(token, propertyId, {
      dateRanges: [range],
      dimensions: [dim("deviceCategory")],
      metrics: [met("activeUsers"), met("sessions")],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: 10,
    }),
    runReport(token, propertyId, {
      dateRanges: [range],
      dimensions: [dim("pagePath")],
      metrics: [met("screenPageViews"), met("activeUsers"), met("averageSessionDuration")],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 25,
    }),
    runReport(token, propertyId, {
      dateRanges: [range],
      dimensions: [dim("landingPage")],
      metrics: [met("sessions"), met("bounceRate"), met("conversions")],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 20,
    }),
    runReport(token, propertyId, {
      dateRanges: [range],
      dimensions: [dim("eventName")],
      metrics: [met("eventCount")],
      orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
      limit: 20,
    }),
    runRealtime(token, propertyId, {
      dimensions: [dim("country")],
      metrics: [met("activeUsers")],
      limit: 10,
    }).catch(() => null),
  ]);

  const t = rows(totals)[0]?.values ?? [];
  const p = rows(prevTotals)[0]?.values ?? [];
  const keys = [
    "activeUsers",
    "newUsers",
    "sessions",
    "pageViews",
    "engagementRate",
    "avgSessionDuration",
    "bounceRate",
    "conversions",
  ];
  const totalsObj: Record<string, { value: number; previous: number; delta: number }> = {};
  keys.forEach((k, i) => {
    const value = t[i] ?? 0;
    const previous = p[i] ?? 0;
    totalsObj[k] = {
      value,
      previous,
      delta: previous ? ((value - previous) / previous) * 100 : 0,
    };
  });

  const realtimeRows = realtime ? rows(realtime) : [];

  return {
    totals: totalsObj,
    series: rows(series).map((r) => ({
      date: r.keys[0],
      users: r.values[0],
      sessions: r.values[1],
      pageViews: r.values[2],
    })),
    countries: rows(countries).map((r) => ({
      country: r.keys[0],
      code: r.keys[1],
      users: r.values[0],
      sessions: r.values[1],
      engagementRate: r.values[2],
    })),
    languages: rows(languages).map((r) => ({
      language: r.keys[0],
      users: r.values[0],
      sessions: r.values[1],
    })),
    sources: rows(sources).map((r) => ({
      source: r.keys[0],
      channel: r.keys[1],
      sessions: r.values[0],
      users: r.values[1],
      conversions: r.values[2],
    })),
    devices: rows(devices).map((r) => ({
      device: r.keys[0],
      users: r.values[0],
      sessions: r.values[1],
    })),
    pages: rows(pages).map((r) => ({
      path: r.keys[0],
      pageViews: r.values[0],
      users: r.values[1],
      avgDuration: r.values[2],
    })),
    landings: rows(landings).map((r) => ({
      path: r.keys[0],
      sessions: r.values[0],
      bounceRate: r.values[1],
      conversions: r.values[2],
    })),
    events: rows(events).map((r) => ({ name: r.keys[0], count: r.values[0] })),
    realtime: {
      users: realtimeRows.reduce((a: number, r: any) => a + (r.values[0] || 0), 0),
      byCountry: realtimeRows.map((r: any) => ({
        country: r.keys[0],
        users: r.values[0],
      })),
    },
  };
}

// ── First-party funnel from our own database ──────────────────────────
async function buildFirstParty(admin: any, days: number) {
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
  const prevSince = new Date(Date.now() - 2 * days * 24 * 3600 * 1000).toISOString();

  const count = async (table: string, column: string, from: string, to?: string) => {
    let q = admin
      .from(table)
      .select("id", { count: "exact", head: true })
      .gte(column, from);
    if (to) q = q.lt(column, to);
    const { count: c, error } = await q;
    if (error) {
      console.warn(`[firstParty] ${table}:`, error.message);
      return 0;
    }
    return c ?? 0;
  };

  const [signups, prevSignups, works, prevWorks] = await Promise.all([
    count("profiles", "created_at", since),
    count("profiles", "created_at", prevSince, since),
    count("works", "created_at", since),
    count("works", "created_at", prevSince, since),
  ]);

  let purchases = 0;
  let prevPurchases = 0;
  try {
    const { data } = await admin
      .from("credit_transactions")
      .select("created_at,type")
      .gte("created_at", prevSince)
      .eq("type", "purchase")
      .limit(10000);
    for (const row of data || []) {
      if (row.created_at >= since) purchases++;
      else prevPurchases++;
    }
  } catch (_e) { /* optional */ }

  const withDelta = (value: number, previous: number) => ({
    value,
    previous,
    delta: previous ? ((value - previous) / previous) * 100 : 0,
  });

  return {
    signups: withDelta(signups, prevSignups),
    works: withDelta(works, prevWorks),
    purchases: withDelta(purchases, prevPurchases),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    let body: any = {};
    if (req.method === "POST") {
      try { body = await req.json(); } catch { /* empty */ }
    }
    const days = Math.min(Math.max(Number(body?.days) || 28, 1), 365);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer "))
      return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const firstParty = await buildFirstParty(admin, days).catch((e) => {
      console.error("[firstParty]", e);
      return null;
    });

    const rawSa = Deno.env.get("GA4_SERVICE_ACCOUNT_JSON");
    const propertyId = Deno.env.get("GA4_PROPERTY_ID");
    if (!rawSa || !propertyId) {
      return json({
        days,
        generatedAt: new Date().toISOString(),
        ga4: null,
        firstParty,
        configured: false,
        error:
          "Falta configurar GA4_SERVICE_ACCOUNT_JSON y/o GA4_PROPERTY_ID para leer la API de Google Analytics.",
      });
    }

    let ga4: any = null;
    let error: string | null = null;
    try {
      const sa = JSON.parse(rawSa);
      const token = await getAccessToken(sa);
      ga4 = await buildGa4(String(propertyId), token, days);
    } catch (e) {
      error = String(e);
      console.error("[ga4]", error);
    }

    return json({
      days,
      generatedAt: new Date().toISOString(),
      configured: true,
      ga4,
      firstParty,
      error,
    });
  } catch (e) {
    console.error("[traffic-dashboard]", e);
    return json({ error: String(e) }, 500);
  }
});
