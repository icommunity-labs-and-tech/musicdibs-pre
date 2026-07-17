import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const MAILERLITE_API_KEY = Deno.env.get("MAILERLITE_API_KEY")!;
const MAILERLITE_API_URL = "https://connect.mailerlite.com/api";

const ML_GROUPS = {
  todos_es: "184716034425488438", todos_en: "184893161875703104", todos_pt: "184893167954298415",
  kyc_pendiente_es: "186736686730839787", kyc_pendiente_en: "186736699734230889", kyc_pendiente_pt: "186736708193093233",
  completar_kyc_es: "187343641444877534", completar_kyc_en: "187343646561928648", completar_kyc_pt: "187343651518547568",
  mensuales_es: "179653836933170957", mensuales_en: "179655903760353011", mensuales_pt: "179655918471874176",
  anuales_es: "179655929185175246", anuales_en: "179655937992165159", anuales_pt: "179655947115824759",
  sin_creditos_es: "184095888770073830", sin_creditos_en: "184095891299239754", sin_creditos_pt: "184095895331013822",
  pocos_creditos_es: "184095872067306902", pocos_creditos_en: "184095874480080208", pocos_creditos_pt: "184095876806870885",
  creditos_criticos_es: "184095880643609952", creditos_criticos_en: "184095883445404882", creditos_criticos_pt: "184095886230422547",
  renovacion_proxima_es: "184095856285189275", renovacion_proxima_en: "184095859414139935", renovacion_proxima_pt: "184095862266267414",
  renovacion_urgente_es: "184095864692672359", renovacion_urgente_en: "184095866985908063", renovacion_urgente_pt: "184095869515072664",
  aniversario_sin_plan_es: "184095907676947790", aniversario_sin_plan_en: "184136761695274907", aniversario_sin_plan_pt: "184136770538964767",
  recuperar_es: "180549266623694014", recuperar_en: "180549280191218751", recuperar_pt: "180549290870965583",
  single_recompra_es: "184095898858424250", single_recompra_en: "184095901652878676", single_recompra_pt: "184095904732547024",
} as const;

type GroupKey = keyof typeof ML_GROUPS;
const ALL_KNOWN_GROUPS = new Set(Object.values(ML_GROUPS));

const TIER_CREDITS: Record<string, number> = {
  monthly: 8, annual_100: 100, annual_200: 200,
  annual_300: 300, annual_500: 500, annual_1000: 1000, annual_legacy: 100,
};

function getLang(language: string | null): "es" | "en" | "pt" {
  const l = (language || "es").toLowerCase().slice(0, 2);
  if (l === "en") return "en";
  if (l === "pt") return "pt";
  return "es";
}

interface Profile {
  email: string; language: string | null; kyc_status: string | null;
  subscription_plan: string | null; subscription_tier: string | null;
  available_credits: number | null; created_at: string;
  sub_period_end?: string | null; sub_status?: string | null;
  had_topup?: boolean;
}

function computeCreditThresholds(plan: string, tier: string | null): { critical: number; low: number } {
  const isPaid = plan !== 'Free' && plan !== '';
  if (!isPaid) return { critical: 2, low: 5 };
  const base = TIER_CREDITS[tier || 'monthly'] ?? 8;
  return { critical: Math.max(1, Math.floor(base * 0.20)), low: Math.max(2, Math.floor(base * 0.40)) };
}

function computeTargetGroups(p: Profile): Set<string> {
  const lang = getLang(p.language);
  const groups = new Set<string>();
  const now = new Date();

  // 1. Todos Musicdibs
  groups.add(ML_GROUPS[`todos_${lang}` as GroupKey]);

  // 2. KYC
  if (p.kyc_status !== 'verified') {
    groups.add(ML_GROUPS[`kyc_pendiente_${lang}` as GroupKey]);
    if (p.kyc_status === 'pending' || p.kyc_status === 'failed')
      groups.add(ML_GROUPS[`completar_kyc_${lang}` as GroupKey]);
  }

  // 3. Plan
  const plan = (p.subscription_plan || 'Free').toLowerCase();
  const tier = (p.subscription_tier || '').toLowerCase();
  const hasPaidPlan = plan !== 'free' && plan !== '';

  if (plan === 'monthly' || tier === 'monthly') groups.add(ML_GROUPS[`mensuales_${lang}` as GroupKey]);
  else if (plan === 'annual' || tier.startsWith('annual')) groups.add(ML_GROUPS[`anuales_${lang}` as GroupKey]);

  // 4. Aniversario sin plan (Free >= 30 days, never had paid)
  if (!hasPaidPlan) {
    const days = (now.getTime() - new Date(p.created_at).getTime()) / 86400000;
    const hadPaidSub = p.sub_status && ['expired', 'cancelled', 'past_due'].includes(p.sub_status);
    if (days >= 30 && !hadPaidSub) groups.add(ML_GROUPS[`aniversario_sin_plan_${lang}` as GroupKey]);
  }

  // 5. Recuperar suscriptores: was paid, now Free, sub already expired
  if (!hasPaidPlan && p.sub_status && ['expired', 'cancelled', 'past_due'].includes(p.sub_status)) {
    const subEnd = p.sub_period_end ? new Date(p.sub_period_end) : null;
    if (subEnd && subEnd < now) {
      groups.add(ML_GROUPS[`recuperar_${lang}` as GroupKey]);
    }
  }

  // 6. Single recompra: bought topup credits, now Free (no active sub)
  if (!hasPaidPlan && p.had_topup) {
    groups.add(ML_GROUPS[`single_recompra_${lang}` as GroupKey]);
  }

  // 7. Credits — skip active paid subscribers (they auto-renew, credit alerts are irrelevant)
  const isActivePaidSub = hasPaidPlan && p.sub_status === 'active';
  if (!isActivePaidSub) {
    const credits = p.available_credits ?? 0;
    const { critical, low } = computeCreditThresholds(p.subscription_plan || 'Free', p.subscription_tier);
    if (credits === 0) groups.add(ML_GROUPS[`sin_creditos_${lang}` as GroupKey]);
    else if (credits <= critical) groups.add(ML_GROUPS[`creditos_criticos_${lang}` as GroupKey]);
    else if (credits <= low) groups.add(ML_GROUPS[`pocos_creditos_${lang}` as GroupKey]);
  }

  // 8. Renovacion (active subs only, 7-day window)
  if (hasPaidPlan && p.sub_status === 'active' && p.sub_period_end) {
    const days = (new Date(p.sub_period_end).getTime() - now.getTime()) / 86400000;
    if (days >= 0 && days <= 3) groups.add(ML_GROUPS[`renovacion_urgente_${lang}` as GroupKey]);
    else if (days > 3 && days <= 7) groups.add(ML_GROUPS[`renovacion_proxima_${lang}` as GroupKey]);
  }

  return groups;
}

async function mlCall(method: string, endpoint: string, body?: object): Promise<any> {
  const res = await fetch(`${MAILERLITE_API_URL}${endpoint}`, {
    method,
    headers: { Authorization: `Bearer ${MAILERLITE_API_KEY}`, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 404 || res.status === 204) return { ok: true };
  if (!res.ok) throw new Error(`ML ${method} ${endpoint} -> ${res.status}`);
  return res.json();
}

async function mlGetSubscriberGroups(email: string): Promise<Set<string> | null> {
  const enc = encodeURIComponent(email);
  try {
    const data = await mlCall('GET', `/subscribers/${enc}`);
    if (data?.ok) return null;
    if (!data?.data?.groups) return new Set();
    return new Set((data.data.groups as any[]).map((g: any) => String(g.id)));
  } catch { return new Set(); }
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function syncUser(p: Profile): Promise<{ added: number; removed: number; created: boolean }> {
  const targetGroups = computeTargetGroups(p);
  const enc = encodeURIComponent(p.email);
  const currentGroups = await mlGetSubscriberGroups(p.email);
  if (currentGroups === null) {
    await mlCall('POST', '/subscribers', { email: p.email, groups: [...targetGroups], status: 'active' });
    return { added: targetGroups.size, removed: 0, created: true };
  }
  const toAdd = [...targetGroups].filter(g => !currentGroups.has(g));
  const toRemove = [...currentGroups].filter(g => ALL_KNOWN_GROUPS.has(g) && !targetGroups.has(g));
  if (toAdd.length === 0 && toRemove.length === 0) return { added: 0, removed: 0, created: false };
  let added = 0, removed = 0;
  for (const gId of toAdd) {
    try { await mlCall('POST', `/subscribers/${enc}/groups/${gId}`); added++; await sleep(150); } catch (_) {}
  }
  for (const gId of toRemove) {
    try { await mlCall('DELETE', `/subscribers/${enc}/groups/${gId}`); removed++; await sleep(150); } catch (_) {}
  }
  return { added, removed, created: false };
}

serve(async (req) => {
  const envSecret = Deno.env.get('CRON_SECRET') || '+mzY;A7C27[OO%T}';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const authHeader = req.headers.get('Authorization') || '';
  const cronHeader = req.headers.get('x-cron-secret') || '';
  if (cronHeader !== envSecret && authHeader !== `Bearer ${envSecret}` && authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
  let body: any = {};
  try { body = await req.json(); } catch (_) {}

  const batchSize: number = Math.min(body.batch_size || 25, 50);
  const maxPages: number = body.max_pages || 1;
  const order: 'asc' | 'desc' = body.order === 'desc' ? 'desc' : 'asc';
  const pageOffset: number = body.page_offset || 0;
  const dryRun: boolean = body.dry_run === true;

  console.log(`[ML-LIFECYCLE] v10 offset=${pageOffset} batch=${batchSize} pages=${maxPages}`);
  const startTime = Date.now();
  let totalProcessed = 0, totalAdded = 0, totalRemoved = 0, totalCreated = 0;

  for (let page = 0; page < maxPages; page++) {
    const absoluteOffset = pageOffset + page * batchSize;
    const { data: rows, error } = await supabase.rpc('get_profiles_with_email', {
      p_limit: batchSize, p_offset: absoluteOffset, p_order_asc: order === 'asc',
    });
    if (error) { console.error('RPC error:', error.message); break; }
    if (!rows || rows.length === 0) { console.log(`No more rows at offset ${absoluteOffset}`); break; }

    for (const row of rows as any[]) {
      const profile: Profile = {
        email: row.email, language: row.language, kyc_status: row.kyc_status,
        subscription_plan: row.subscription_plan, subscription_tier: row.subscription_tier,
        available_credits: row.available_credits, created_at: row.created_at,
        sub_period_end: row.sub_period_end, sub_status: row.sub_status,
        had_topup: row.had_topup,
      };
      if (dryRun) { totalProcessed++; continue; }
      try {
        const r = await syncUser(profile);
        totalProcessed++; totalAdded += r.added; totalRemoved += r.removed;
        if (r.created) { totalCreated++; console.log(`CREATED ${row.email} +${r.added}`); }
        else if (r.added > 0 || r.removed > 0) console.log(`${row.email} +${r.added} -${r.removed}`);
      } catch (e) { console.warn(`Error ${row.email}:`, (e as Error).message); }
      await sleep(200);
    }
    if ((rows as any[]).length < batchSize) break;
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const result = {
    success: true, page_offset: pageOffset,
    next_offset: pageOffset + maxPages * batchSize,
    total_processed: totalProcessed, total_added: totalAdded,
    total_removed: totalRemoved, total_created: totalCreated,
    elapsed_seconds: elapsed
  };
  console.log('Done', JSON.stringify(result));
  return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
});
