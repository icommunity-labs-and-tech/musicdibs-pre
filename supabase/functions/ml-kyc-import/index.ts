import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const ML_KEY = Deno.env.get('MAILERLITE_API_KEY')!;
const ML_URL = 'https://connect.mailerlite.com/api';
// FIX 2026-07-19 (security scan): se elimina el fallback hardcodeado
// (secreto literal expuesto en el codigo fuente) que quedaba usable como
// credencial de bypass si CRON_SECRET no estaba seteado. Ahora, si falta
// la variable de entorno, CRON_SECRET queda vacio y ningun x-cron-secret vacio
// puede autenticar (se exige ademas que CRON_SECRET no este vacio).
const CRON_SECRET = Deno.env.get('CRON_SECRET') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const GROUPS = {
  kyc_pendiente: { es: '186736686730839787', en: '186736699734230889', pt: '186736708193093233' },
  completar_kyc: { es: '187343641444877534', en: '187343646561928648', pt: '187343651518547568' },
};

const VALID_EMAIL = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const LANG_MAP: Record<string, 'es'|'en'|'pt'> = { es:'es', en:'en', 'pt-BR':'pt' };

async function mlBulkImport(groupId: string, subscribers: {email:string}[]) {
  const res = await fetch(`${ML_URL}/subscribers/import`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', Authorization:`Bearer ${ML_KEY}` },
    body: JSON.stringify({ group_id: groupId, subscribers, autoresponders: false, resubscribe: false }),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`ML ${res.status}: ${txt.slice(0,300)}`);
  return JSON.parse(txt);
}

function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)); }

serve(async (req) => {
  const auth = req.headers.get('Authorization')||'';
  const cron = req.headers.get('x-cron-secret')||'';
  const cronSecretOk = !!CRON_SECRET && (cron === CRON_SECRET || auth === `Bearer ${CRON_SECRET}`);
  if (!cronSecretOk && auth !== `Bearer ${SERVICE_KEY}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body:any={};
  try { body = await req.json(); } catch(_){}
  const offset:number = body.offset || 0;
  const PAGE_SIZE = 500;
  const MAX_PAGES = 4; // 2000 users per invocation

  console.log(`[KYC-IMPORT] v4 start offset=${offset} ML_KEY_present=${!!ML_KEY}`);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, SERVICE_KEY);

  const buckets: Record<string, {pendiente:string[], completar:string[]}> = {
    es:{pendiente:[],completar:[]}, en:{pendiente:[],completar:[]}, pt:{pendiente:[],completar:[]}
  };

  let lastOffset = -1;
  for (let page=0; page<MAX_PAGES; page++) {
    const pageOffset = offset + page*PAGE_SIZE;
    const { data, error } = await supabase.rpc('get_profiles_with_email', {
      p_limit: PAGE_SIZE, p_offset: pageOffset, p_order_asc: true,
    });
    if (error) { console.error('DB error:', error.message); break; }
    if (!data || data.length===0) { console.log(`[KYC-IMPORT] No more data at offset ${pageOffset}`); break; }

    for (const r of data as any[]) {
      if (!r.email || !VALID_EMAIL.test(r.email)) continue;
      const lang = LANG_MAP[r.language];
      if (!lang) continue;
      if (r.kyc_status==='verified') continue;
      buckets[lang].pendiente.push(r.email);
      if (r.kyc_status==='pending'||r.kyc_status==='failed') buckets[lang].completar.push(r.email);
    }

    if (data.length < PAGE_SIZE) break;
    lastOffset = pageOffset + PAGE_SIZE;
  }

  const summary: Record<string,any> = {};
  for (const lang of ['es','en','pt'] as const) {
    summary[lang] = {};
    for (const [type, groupId] of [['pendiente',GROUPS.kyc_pendiente[lang]],['completar',GROUPS.completar_kyc[lang]]] as [string,string][]) {
      const emails = buckets[lang][type as 'pendiente'|'completar'];
      if (!emails.length) continue;
      try {
        const r = await mlBulkImport(groupId, emails.map(e=>({email:e})));
        const d = r.data||r;
        summary[lang][type] = { imported: d.imported||0, unchanged: d.unchanged_count||0 };
        console.log(`[KYC] ${lang} ${type}: +${d.imported||0} new, ${d.unchanged_count||0} unchanged`);
      } catch(e) {
        const msg = (e as Error).message;
        summary[lang][type] = { error: msg };
        console.error(`[KYC] ${lang} ${type} error:`, msg);
      }
      await sleep(400);
    }
  }

  console.log('[KYC-IMPORT] Done', JSON.stringify({offset, lastOffset, summary}));
  return new Response(JSON.stringify({success:true, offset, next_offset:lastOffset, summary}), {
    headers:{'Content-Type':'application/json'}
  });
});
