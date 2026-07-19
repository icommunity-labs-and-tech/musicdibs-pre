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

const GATEWAY = "https://connector-gateway.lovable.dev/semrush";
const DOMAIN = "musicdibs.com";

// Databases with country + language mapping
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
  if (!res.ok) {
    throw new Error(`Semrush ${path} [${res.status}]: ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Semrush ${path}: invalid JSON: ${text.slice(0, 200)}`);
  }
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

async function fetchDatabase(db: string, limit: number) {
  // Keywords with previous position (Pp)
  const kwPayload = await semrush("/domains/domain_organic", {
    domain: DOMAIN,
    database: db,
    export_columns: "Ph,Po,Pp,Nq,Cp,Ur,Tr",
    display_limit: String(limit),
  }).catch((e) => ({ __error: String(e) }));

  // Overview
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
        // delta: negative = improved (moved to smaller number = better)
        // We invert for UX: positive delta = subió; negative = bajó
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

  const alerts = keywords
    .filter((k) => Math.abs(k.delta) >= 3 && k.previous > 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 15);

  return {
    db,
    ...DATABASES[db],
    overview: overview
      ? {
          organicKeywords: Number(overview.Or) || 0,
          organicTraffic: Number(overview.Ot) || 0,
          organicCost: Number(overview.Oc) || 0,
          rank: Number(overview.Rk) || 0,
        }
      : null,
    keywords,
    alerts,
    error: (kwPayload as any).__error || (ovPayload as any).__error || null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    // Admin auth
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

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const url = new URL(req.url);
    const dbParam = url.searchParams.get("db"); // if null, fetch all
    const limit = Math.min(
      Number(url.searchParams.get("limit") || "25"),
      100,
    );

    const targets = dbParam
      ? [dbParam].filter((d) => DATABASES[d])
      : Object.keys(DATABASES);

    const results = await Promise.all(
      targets.map((d) => fetchDatabase(d, limit)),
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
