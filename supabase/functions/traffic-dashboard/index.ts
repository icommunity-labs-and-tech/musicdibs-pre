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

// ── Merge several GA4 properties into one summed view ────────────────
type Ga4 = Awaited<ReturnType<typeof buildGa4>>;

function sumTotals(
  parts: Ga4[],
): Ga4["totals"] {
  const wavg = (key: string, weightKey: string) => {
    let num = 0, den = 0;
    for (const p of parts) {
      const w = p.totals[weightKey]?.value ?? 0;
      num += (p.totals[key]?.value ?? 0) * w;
      den += w;
    }
    return den > 0 ? num / den : 0;
  };
  const sum = (key: string, prev = false) =>
    parts.reduce((a, p) => a + (p.totals[key]?.[prev ? "previous" : "value"] ?? 0), 0);

  const keys = ["activeUsers", "newUsers", "sessions", "pageViews", "conversions"];
  const totals: Ga4["totals"] = {};
  for (const k of keys) {
    const value = sum(k), previous = sum(k, true);
    totals[k] = { value, previous, delta: previous ? ((value - previous) / previous) * 100 : 0 };
  }
  // Rates and durations: session-weighted averages (current period only).
  totals.engagementRate = { value: wavg("engagementRate", "sessions"), previous: 0, delta: 0 };
  totals.bounceRate = { value: wavg("bounceRate", "sessions"), previous: 0, delta: 0 };
  totals.avgSessionDuration = { value: wavg("avgSessionDuration", "sessions"), previous: 0, delta: 0 };
  return totals;
}

function mergeGa4(parts: Ga4[]): Ga4 {
  const groupSum = <T extends Record<string, any>>(
    lists: T[][],
    keyOf: (r: T) => string,
    numKeys: (keyof T & string)[],
    wavgKey?: { key: keyof T & string; weight: keyof T & string },
  ): T[] => {
    const map = new Map<string, T>();
    for (const list of lists) {
      for (const row of list) {
        const k = keyOf(row);
        const acc: any = map.get(k) ?? { ...row };
        if (map.has(k)) {
          for (const nk of numKeys) acc[nk] = (acc[nk] ?? 0) + (row[nk] ?? 0);
          if (wavgKey) {
            const w1 = acc.__w ?? 0, w2 = (row[wavgKey.weight] as number) ?? 0;
            const v1 = acc[wavgKey.key] ?? 0, v2 = (row[wavgKey.key] as number) ?? 0;
            acc[wavgKey.key] = w1 + w2 > 0 ? (v1 * w1 + v2 * w2) / (w1 + w2) : 0;
            acc.__w = w1 + w2;
          }
        } else if (wavgKey) {
          acc.__w = (row[wavgKey.weight] as number) ?? 0;
        }
        map.set(k, acc);
      }
    }
    return [...map.values()].map(({ __w, ...rest }: any) => rest) as T[];
  };

  const seriesMap = new Map<string, { date: string; users: number; sessions: number; pageViews: number }>();
  for (const p of parts) {
    for (const s of p.series) {
      const acc = seriesMap.get(s.date) ?? { date: s.date, users: 0, sessions: 0, pageViews: 0 };
      acc.users += s.users; acc.sessions += s.sessions; acc.pageViews += s.pageViews;
      seriesMap.set(s.date, acc);
    }
  }

  return {
    totals: sumTotals(parts),
    series: [...seriesMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    countries: groupSum(parts.map((p) => p.countries), (r) => r.code || r.country, ["users", "sessions"], { key: "engagementRate", weight: "sessions" })
      .sort((a, b) => b.users - a.users).slice(0, 20),
    languages: groupSum(parts.map((p) => p.languages), (r) => r.language, ["users", "sessions"])
      .sort((a, b) => b.users - a.users).slice(0, 15),
    sources: groupSum(parts.map((p) => p.sources), (r) => `${r.source}|${r.channel}`, ["sessions", "users", "conversions"])
      .sort((a, b) => b.sessions - a.sessions).slice(0, 20),
    devices: groupSum(parts.map((p) => p.devices), (r) => r.device, ["users", "sessions"])
      .sort((a, b) => b.users - a.users),
    pages: groupSum(parts.map((p) => p.pages), (r) => r.path, ["pageViews", "users"], { key: "avgDuration", weight: "pageViews" })
      .sort((a, b) => b.pageViews - a.pageViews).slice(0, 25),
    landings: groupSum(parts.map((p) => p.landings), (r) => r.path, ["sessions", "conversions"], { key: "bounceRate", weight: "sessions" })
      .sort((a, b) => b.sessions - a.sessions).slice(0, 20),
    events: groupSum(parts.map((p) => p.events), (r) => r.name, ["count"])
      .sort((a, b) => b.count - a.count).slice(0, 20),
    realtime: {
      users: parts.reduce((a, p) => a + p.realtime.users, 0),
      byCountry: groupSum(parts.map((p) => p.realtime.byCountry), (r) => r.country, ["users"])
        .sort((a, b) => b.users - a.users).slice(0, 10),
    },
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
    // Supports one or more GA4 properties, summed into a single view.
    // GA4_PROPERTY_IDS="123,456" takes precedence over GA4_PROPERTY_ID.
    const propertyIds = (
      Deno.env.get("GA4_PROPERTY_IDS") ?? Deno.env.get("GA4_PROPERTY_ID") ?? ""
    )
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!rawSa || propertyIds.length === 0) {
      return json({
        days,
        generatedAt: new Date().toISOString(),
        ga4: null,
        firstParty,
        configured: false,
        error:
          "Falta configurar GA4_SERVICE_ACCOUNT_JSON y/o GA4_PROPERTY_IDS para leer la API de Google Analytics.",
      });
    }

    let ga4: any = null;
    let error: string | null = null;
    try {
      const sa = JSON.parse(rawSa);
      const token = await getAccessToken(sa);
      const parts = await Promise.all(
        propertyIds.map((id) => buildGa4(id, token, days)),
      );
      ga4 = parts.length === 1 ? parts[0] : mergeGa4(parts);
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
