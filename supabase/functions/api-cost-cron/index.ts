import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Auth: cron secret, service role Bearer, or authenticated admin JWT
  const cronSecret = req.headers.get('x-cron-secret');
  const authHeader = req.headers.get('Authorization');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  let isAuthorized =
    (cronSecret && cronSecret === Deno.env.get('CRON_SECRET')) ||
    (authHeader === `Bearer ${serviceKey}`);

  if (!isAuthorized && authHeader?.startsWith('Bearer ')) {
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userErr } = await userClient.auth.getUser(token);
    if (!userErr && user?.id) {
      const adminCheck = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey!);
      const { data: roles } = await adminCheck
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .limit(1);
      if (roles && roles.length > 0) isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const body = await req.json().catch(() => ({}));
  const targetDate = body.date || (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  })();

  // ── Read pricing config from operation_pricing (única fuente de verdad) ──
  const { data: configs, error: configErr } = await supabase
    .from('operation_pricing')
    .select('operation_key, price_per_credit_eur, api_cost_eur, credits_cost')
    .eq('is_active', true);

  if (configErr || !configs) {
    return new Response(JSON.stringify({ error: 'Cannot load operation_pricing', detail: configErr?.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const configMap: Record<string, { price_per_credit_eur: number; api_cost_eur: number }> = {};
  for (const c of configs as any[]) {
    configMap[c.operation_key] = {
      price_per_credit_eur: Number(c.price_per_credit_eur ?? 0.60),
      api_cost_eur: Number(c.api_cost_eur ?? 0),
    };
  }

  // ── Aggregate transactions by feature_key (already stored on row) ──
  const { data: transactions, error: txErr } = await supabase
    .from('credit_transactions')
    .select('feature_key, amount')
    .eq('type', 'usage')
    .lt('amount', 0)
    .not('feature_key', 'is', null)
    .gte('created_at', `${targetDate}T00:00:00Z`)
    .lt('created_at', `${targetDate}T23:59:59Z`);

  if (txErr) {
    return new Response(JSON.stringify({ error: 'Cannot load transactions', detail: txErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const featureStats: Record<string, { uses: number; credits: number }> = {};
  for (const tx of transactions || []) {
    const fk = (tx as any).feature_key as string;
    if (!fk) continue;
    if (!featureStats[fk]) featureStats[fk] = { uses: 0, credits: 0 };
    featureStats[fk].uses += 1;
    featureStats[fk].credits += Math.abs(tx.amount);
  }

  const results = [];
  for (const [featureKey, stats] of Object.entries(featureStats)) {
    const config = configMap[featureKey];
    if (!config) continue;
    const totalRevenue = stats.credits * config.price_per_credit_eur;
    const totalApiCost = stats.uses * config.api_cost_eur;
    const grossMargin = totalRevenue - totalApiCost;
    const marginPct = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;
    const row = {
      date: targetDate,
      feature_key: featureKey,
      total_uses: stats.uses,
      total_credits_charged: stats.credits,
      total_revenue_eur: Math.round(totalRevenue * 10000) / 10000,
      total_api_cost_eur: Math.round(totalApiCost * 1000000) / 1000000,
      gross_margin_eur: Math.round(grossMargin * 10000) / 10000,
      margin_pct: Math.round(marginPct * 100) / 100,
    };
    await supabase.from('api_cost_daily').upsert(row, { onConflict: 'date,feature_key' });
    results.push(row);
  }

  return new Response(
    JSON.stringify({ success: true, date: targetDate, features: results.length, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
