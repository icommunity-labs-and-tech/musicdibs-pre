import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const GATEWAY = "https://connector-gateway.lovable.dev/semrush";
const DOMAIN = "musicdibs.com";

const DATABASES: Record<
  string,
  { country: string; language: string; flag: string; label: string }
> = {
  es: { country: "ES", language: "es", flag: "🇪🇸", label: "España" },
  us: { country: "US", language: "en", flag: "🇺🇸", label: "Estados Unidos" },
  uk: { country: "UK", language: "en", flag: "🇬🇧", label: "Reino Unido" },
  mx: { country: "MX", language: "es", flag: "🇲🇽", label: "México" },
  ar: { country: "AR", language: "es", flag: "🇦🇷", label: "Argentina" },
  co: { country: "CO", language: "es", flag: "🇨🇴", label: "Colombia" },
  br: { country: "BR", language: "pt", flag: "🇧🇷", label: "Brasil" },
};

async function semrush(path: string, params: Record<string, string>) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const semKey = Deno.env.get("SEMRUSH_API_KEY");
  if (!lovableKey || !semKey) throw new Error("Missing gateway credentials");
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${GATEWAY}${path}?${qs}`, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": semKey,
      "Allow-Limit-Offset": "true",
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Semrush ${path} [${res.status}]: ${text}`);
  // Semrush returns 200 with a JSON error body when quota/plan issues occur.
  // Surface those so the UI shows the real cause instead of "empty".
  let parsed: any;
  try { parsed = JSON.parse(text); }
  catch {
    // Non-JSON error strings like "ERROR 134 :: TOTAL LIMIT EXCEEDED"
    if (/^ERROR\s+\d+/i.test(text.trim())) throw new Error(text.trim());
    throw new Error(`Semrush ${path}: invalid JSON: ${text.slice(0, 200)}`);
  }
  if (parsed && typeof parsed === "object" && parsed.error && !parsed.data) {
    throw new Error(String(parsed.error));
  }
  return parsed;
}

function rowsToObjects(payload: any): any[] {
  const cols: string[] = payload?.data?.columnNames ?? [];
  const rows: any[][] = payload?.data?.rows ?? [];
  return rows.map((r) => {
    const o: Record<string, any> = {};
    cols.forEach((c, i) => (o[c] = r[i]));
    return o;
  });
}

async function fetchDatabaseKeywords(db: string, limit: number) {
  const kwPayload = await semrush("/domains/domain_organic", {
    domain: DOMAIN,
    database: db,
    export_columns: "Ph,Po,Pp,Nq,Cp,Ur,Tr",
    display_limit: String(limit),
  }).catch((e) => ({ __error: String(e) }));

  const ovPayload = await semrush("/domains/domain_ranks", {
    domain: DOMAIN,
    database: db,
    export_columns: "Db,Dn,Rk,Or,Ot,Oc",
  }).catch((e) => ({ __error: String(e) }));

  const keywords = (kwPayload as any).__error
    ? []
    : rowsToObjects(kwPayload).map((r) => {
        const pos = Number(r.Po) || 0;
        const prev = Number(r.Pp) || 0;
        const delta = prev > 0 ? prev - pos : 0;
        return {
          phrase: r.Ph,
          position: pos,
          previous: prev,
          delta,
          volume: Number(r.Nq) || 0,
          cpc: Number(r.Cp) || 0,
          url: r.Ur,
          trafficShare: Number(r.Tr) || 0,
        };
      });

  const overview = (ovPayload as any).__error
    ? null
    : (rowsToObjects(ovPayload)[0] ?? null);

  return {
    keywords,
    overview,
    error: (kwPayload as any).__error || (ovPayload as any).__error || null,
  };
}

async function snapshotDatabase(admin: any, db: string, keywords: any[]) {
  if (!keywords.length) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const rows = keywords.map((k) => ({
    db,
    phrase: k.phrase,
    position: k.position,
    volume: k.volume,
    cpc: k.cpc,
    url: k.url,
    traffic_share: k.trafficShare,
    captured_date: today,
  }));
  const { error } = await admin
    .from("seo_keyword_snapshots")
    .upsert(rows, { onConflict: "db,phrase,captured_date" });
  if (error) {
    console.error(`[snapshot] ${db} failed:`, error.message);
    return 0;
  }
  return rows.length;
}

async function loadHistoryDeltas(admin: any, db: string, phrases: string[]) {
  // Fetch snapshots from last 31 days for these phrases; compute delta7d, delta30d, series.
  if (!phrases.length) return {};
  const since = new Date(Date.now() - 31 * 24 * 3600 * 1000)
    .toISOString().slice(0, 10);
  const { data, error } = await admin
    .from("seo_keyword_snapshots")
    .select("phrase,position,captured_date")
    .eq("db", db)
    .gte("captured_date", since)
    .in("phrase", phrases)
    .order("captured_date", { ascending: true });
  if (error) {
    console.warn(`[history] ${db}:`, error.message);
    return {};
  }
  const byPhrase: Record<string, { date: string; position: number }[]> = {};
  for (const row of data || []) {
    (byPhrase[row.phrase] ||= []).push({
      date: row.captured_date,
      position: row.position,
    });
  }
  const out: Record<string, {
    delta7d: number | null;
    delta30d: number | null;
    series: { date: string; position: number }[];
  }> = {};
  const today = new Date().toISOString().slice(0, 10);
  const dayFor = (offset: number) =>
    new Date(Date.now() - offset * 24 * 3600 * 1000).toISOString().slice(0, 10);
  for (const [phrase, series] of Object.entries(byPhrase)) {
    const latest = series[series.length - 1];
    const findClosest = (targetOffset: number) => {
      const target = dayFor(targetOffset);
      let closest: typeof series[number] | null = null;
      for (const s of series) {
        if (s.date <= target) closest = s;
        else break;
      }
      return closest;
    };
    const p7 = findClosest(7);
    const p30 = findClosest(30);
    out[phrase] = {
      delta7d: p7 && latest && p7.date !== today ? p7.position - latest.position : null,
      delta30d: p30 && latest && p30.date !== today ? p30.position - latest.position : null,
      series,
    };
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let body: any = {};
    if (req.method === "POST") {
      try { body = await req.json(); } catch { /* empty */ }
    }
    const mode = body?.mode || url.searchParams.get("mode");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Cron snapshot mode ──────────────────────────────────────────────
    if (mode === "snapshot") {
      const cronSecret = req.headers.get("x-cron-secret");
      if (cronSecret !== Deno.env.get("CRON_SECRET")) {
        return json({ error: "Unauthorized" }, 401);
      }
      const results: Record<string, number> = {};
      for (const db of Object.keys(DATABASES)) {
        const { keywords } = await fetchDatabaseKeywords(db, 100);
        results[db] = await snapshotDatabase(admin, db, keywords);
      }
      return json({ ok: true, snapshotted: results, at: new Date().toISOString() });
    }

    // ── Admin dashboard mode ────────────────────────────────────────────
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

    // History-only endpoint for a single keyword
    if (mode === "history") {
      const db = body?.db || url.searchParams.get("db");
      const phrase = body?.phrase || url.searchParams.get("phrase");
      if (!db || !phrase) return json({ error: "db and phrase required" }, 400);
      const since = new Date(Date.now() - 90 * 24 * 3600 * 1000)
        .toISOString().slice(0, 10);
      const { data, error } = await admin
        .from("seo_keyword_snapshots")
        .select("captured_date,position,volume")
        .eq("db", db)
        .eq("phrase", phrase)
        .gte("captured_date", since)
        .order("captured_date", { ascending: true });
      if (error) return json({ error: error.message }, 500);
      return json({ db, phrase, series: data ?? [] });
    }

    const dbParam = url.searchParams.get("db") || body?.db;
    const limit = Math.min(Number(url.searchParams.get("limit") || body?.limit || "25"), 100);
    const persist = body?.persist !== false; // default: snapshot today too

    const targets = dbParam
      ? [dbParam].filter((d) => DATABASES[d])
      : Object.keys(DATABASES);

    const results = await Promise.all(
      targets.map(async (db) => {
        const { keywords, overview, error } = await fetchDatabaseKeywords(db, limit);
        // Persist today's snapshot opportunistically (idempotent per day)
        if (persist && keywords.length) {
          await snapshotDatabase(admin, db, keywords);
        }
        const history = await loadHistoryDeltas(
          admin, db, keywords.map((k) => k.phrase),
        );
        const enriched = keywords.map((k) => ({
          ...k,
          delta7d: history[k.phrase]?.delta7d ?? null,
          delta30d: history[k.phrase]?.delta30d ?? null,
          historyPoints: history[k.phrase]?.series?.length ?? 0,
        }));
        const alerts = enriched
          .filter((k) => Math.abs(k.delta) >= 3 && k.previous > 0)
          .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
          .slice(0, 15);
        return {
          db,
          ...DATABASES[db],
          overview: overview ? {
            organicKeywords: Number(overview.Or) || 0,
            organicTraffic: Number(overview.Ot) || 0,
            organicCost: Number(overview.Oc) || 0,
            rank: Number(overview.Rk) || 0,
          } : null,
          keywords: enriched,
          alerts,
          error,
        };
      }),
    );

    return json({
      domain: DOMAIN,
      generatedAt: new Date().toISOString(),
      databases: results,
    });
  } catch (e) {
    console.error("[seo-dashboard]", e);
    return json({ error: String(e) }, 500);
  }
});
