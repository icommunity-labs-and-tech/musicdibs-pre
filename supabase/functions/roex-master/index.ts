import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ROEX_BASE = 'https://tonn.roexaudio.com';

const STYLES = ['ROCK_INDIE','POP','ACOUSTIC','HIPHOP_GRIME','ELECTRONIC','REGGAE_DUB','ORCHESTRAL','METAL','OTHER'] as const;
const LOUDNESS = ['LOW','MEDIUM','HIGH'] as const;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const ROEX_API_KEY = Deno.env.get('ROEX_API_KEY');
    if (!ROEX_API_KEY) {
      return new Response(JSON.stringify({ error: 'missing_roex_key' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabaseUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const body = await req.json();
    const action = body.action as 'preview' | 'preview_status' | 'final';

    // ============================================================
    // PREVIEW: gratis (sin créditos). Sube el audio a ROEX y lanza /masteringpreview
    // ============================================================
    if (action === 'preview') {
      const { audioUrl, filename, musicalStyle, desiredLoudness } = body;
      if (!audioUrl) return new Response(JSON.stringify({ error: 'audioUrl required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      // SSRF protection: reject internal/private addresses and non-http(s) schemes
      const isAllowedUrl = (raw: string): boolean => {
        try {
          const u = new URL(raw);
          if (!['https:', 'http:'].includes(u.protocol)) return false;
          const host = u.hostname.toLowerCase();
          if (/^(169\.254\.|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|::1|fc00:|fe80:)/.test(host)) return false;
          if (host === 'localhost' || host.endsWith('.internal') || host.endsWith('.local')) return false;
          return true;
        } catch { return false; }
      };
      if (!isAllowedUrl(audioUrl)) {
        return new Response(JSON.stringify({ error: 'invalid_audio_url' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const style = STYLES.includes(musicalStyle) ? musicalStyle : 'POP';
      const loudness = LOUDNESS.includes(desiredLoudness) ? desiredLoudness : 'MEDIUM';

      // 1) Descargar el audio del usuario
      const audioRes = await fetch(audioUrl, { redirect: 'error' });

      if (!audioRes.ok) {
        return new Response(JSON.stringify({ error: 'cannot_fetch_source_audio' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const audioBuf = new Uint8Array(await audioRes.arrayBuffer());

      // 2) Determinar contentType válido para ROEX
      const lowerName = (filename || 'track.mp3').toLowerCase();
      let contentType = 'audio/mpeg';
      let safeName = 'track.mp3';
      if (lowerName.endsWith('.wav')) { contentType = 'audio/wav'; safeName = 'track.wav'; }
      else if (lowerName.endsWith('.flac')) { contentType = 'audio/flac'; safeName = 'track.flac'; }
      else if (lowerName.endsWith('.aiff') || lowerName.endsWith('.aif')) { contentType = 'audio/aiff'; safeName = 'track.aiff'; }
      else { contentType = 'audio/mpeg'; safeName = 'track.mp3'; }

      // 3) Pedir URLs firmadas de ROEX
      const upRes = await fetch(`${ROEX_BASE}/upload?key=${ROEX_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: safeName, contentType }),
      });
      if (!upRes.ok) {
        const t = await upRes.text();
        console.error('[ROEX] upload url error:', upRes.status, t);
        return new Response(JSON.stringify({ error: 'roex_upload_failed' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const upData = await upRes.json();
      const signedUrl: string = upData.signed_url;
      const readableUrl: string = upData.readable_url;

      // 4) Subir el archivo a la signed URL (PUT)
      const putRes = await fetch(signedUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: audioBuf });
      if (!putRes.ok) {
        const t = await putRes.text();
        console.error('[ROEX] PUT upload error:', putRes.status, t);
        return new Response(JSON.stringify({ error: 'roex_put_failed' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // 5) Lanzar masteringpreview
      const mpRes = await fetch(`${ROEX_BASE}/masteringpreview?key=${ROEX_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masteringData: {
            trackData: [{ trackURL: readableUrl }],
            musicalStyle: style,
            desiredLoudness: loudness,
            sampleRate: '44100',
          },
        }),
      });
      const mpJson = await mpRes.json().catch(() => ({}));
      if (!mpRes.ok || mpJson.error) {
        console.error('[ROEX] masteringpreview error:', mpRes.status, mpJson);
        return new Response(JSON.stringify({ error: 'roex_preview_failed', detail: mpJson?.message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // El task id puede venir en distintos campos según la respuesta
      const taskId =
        mpJson.mastering_task_id ||
        mpJson.masteringTaskId ||
        mpJson?.previewMasterTaskResults?.mastering_task_id ||
        mpJson?.task_id;

      return new Response(JSON.stringify({ success: true, taskId, style, loudness }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============================================================
    // PREVIEW STATUS: poll para obtener URL del preview (gratis)
    // ============================================================
    if (action === 'preview_status') {
      const { taskId } = body;
      if (!taskId) return new Response(JSON.stringify({ error: 'taskId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const r = await fetch(`${ROEX_BASE}/retrievepreviewmaster?key=${ROEX_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masteringData: { masteringTaskId: taskId } }),
      });

      if (r.status === 202) {
        return new Response(JSON.stringify({ status: 'processing' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        console.error('[ROEX] preview_status error:', r.status, j);
        return new Response(JSON.stringify({ status: 'error', error: j?.message || 'roex_status_failed' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const url = j?.previewMasterTaskResults?.download_url_mastered_preview;
      if (!url) {
        return new Response(JSON.stringify({ status: 'processing' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        status: 'done',
        previewUrl: url,
        previewStartTime: j?.previewMasterTaskResults?.preview_start_time ?? 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ============================================================
    // FINAL: descuenta créditos y descarga el master final completo
    // ============================================================
    if (action === 'final') {
      const { taskId } = body;
      if (!taskId) return new Response(JSON.stringify({ error: 'taskId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      // ── Read cost from DB (single source of truth) ─────────────
      // Priority: operation_pricing → feature_costs → fallback (6)
      let CREDITS_COST = 6;
      try {
        const { data: pricingRow } = await supabase
          .from('operation_pricing')
          .select('credits_cost')
          .eq('operation_key', 'enhance_audio')
          .maybeSingle();
        if (pricingRow?.credits_cost != null) {
          CREDITS_COST = pricingRow.credits_cost;
        } else {
          const { data: costRow } = await supabase
            .from('feature_costs')
            .select('credit_cost')
            .eq('feature_key', 'enhance_audio')
            .maybeSingle();
          if (costRow?.credit_cost != null) CREDITS_COST = costRow.credit_cost;
        }
      } catch (e) {
        console.warn('[ROEX] cost lookup failed, using fallback', e);
      }
      console.log(`[ROEX] enhance_audio cost resolved to ${CREDITS_COST} credits`);

      let roexDeductedFromPermanent = 0;
      {
        const { data: deductResult, error: deductErr } = await supabase.rpc('deduct_credits_ordered', {
          p_user_id: user.id, p_amount: CREDITS_COST, p_feature: 'enhance_audio',
          p_description: 'Masterización ROEX (final)',
        });
        if (deductErr || !deductResult?.success) {
          return new Response(JSON.stringify({ error: 'insufficient_credits' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        roexDeductedFromPermanent = deductResult.from_permanent ?? 0;
      }

      const r = await fetch(`${ROEX_BASE}/retrievefinalmaster?key=${ROEX_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masteringData: { masteringTaskId: taskId } }),
      });

      if (r.status === 202) {
        // Aún procesando: reembolso (el cliente reintentará)
        await supabase.rpc('refund_credits_ordered', { p_user_id: user.id, p_amount: CREDITS_COST, p_from_permanent: roexDeductedFromPermanent, p_reason: 'Reembolso: master aún procesando' });
        return new Response(JSON.stringify({ status: 'processing' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.error) {
        console.error('[ROEX] final error:', r.status, j);
        await supabase.rpc('refund_credits_ordered', { p_user_id: user.id, p_amount: CREDITS_COST, p_from_permanent: roexDeductedFromPermanent, p_reason: 'Reembolso: fallo master ROEX' });
        return new Response(JSON.stringify({ error: j?.message || 'roex_final_failed' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const finalUrl = j?.finalMasterTaskResults?.download_url_mastered;
      if (!finalUrl) {
        await supabase.rpc('refund_credits_ordered', { p_user_id: user.id, p_amount: CREDITS_COST, p_from_permanent: roexDeductedFromPermanent, p_reason: 'Reembolso: master sin URL' });
        return new Response(JSON.stringify({ error: 'no_final_url' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ success: true, finalUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'invalid_action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('[ROEX-MASTER] fatal:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
