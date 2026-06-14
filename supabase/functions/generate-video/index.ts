import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";
import { getOperationCost } from "../_shared/operation-pricing.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/* ── fal.ai config ── */
const FAL_MODEL = 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video';
const FAL_SUBMIT_URL = `https://queue.fal.run/${FAL_MODEL}`;
const FAL_QUEUE_BASE_URL = 'https://queue.fal.run/fal-ai/kling-video';

/* ── Runway config ── */
const RUNWAY_API_BASE = 'https://api.dev.runwayml.com/v1';

/* ── KIE config ── */
const KIE_API_BASE = 'https://api.kie.ai/api/v1';
const KIE_T2V_MODEL = 'kling/v2-5-turbo-text-to-video-pro';
const KIE_I2V_MODEL = 'kling/v2-5-turbo-image-to-video-pro';

type Provider = 'fal' | 'runway' | 'kie';

const jsonResponse = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
  });

const isAllowedFalQueueUrl = (value: unknown): value is string => {
  if (typeof value !== 'string' || !value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.host === 'queue.fal.run';
  } catch {
    return false;
  }
};

const withLogsParam = (url: string) => (url.includes('?') ? `${url}&logs=1` : `${url}?logs=1`);
const getFallbackStatusUrl = (requestId: string) => `${FAL_QUEUE_BASE_URL}/requests/${requestId}/status`;
const getFallbackResponseUrl = (requestId: string) => `${FAL_QUEUE_BASE_URL}/requests/${requestId}`;

/* ── Runway helpers ── */
const mapAspectToRunway = (ar: string): string => {
  const map: Record<string, string> = {
    '16:9': '1280:720', '9:16': '720:1280',
    '1:1': '720:720', '4:3': '960:720', '3:4': '720:960',
  };
  return map[ar] || '1280:720';
};

const mapDurationToRunway = (d: number): number => (d >= 10 ? 10 : 5);

/* ── fal.ai status handler ── */
async function handleFalStatus(falHeaders: Record<string, string>, statusUrl: string | null, requestId: string | null) {
  const resolvedStatusUrl = isAllowedFalQueueUrl(statusUrl)
    ? statusUrl
    : (typeof requestId === 'string' && requestId)
      ? getFallbackStatusUrl(requestId)
      : null;

  if (!resolvedStatusUrl) throw new Error('statusUrl or requestId is required for status check');

  const statusRes = await fetch(withLogsParam(resolvedStatusUrl), {
    method: 'GET',
    headers: falHeaders,
  });

  if (!statusRes.ok) {
    const errorText = await statusRes.text();
    console.error(`[VIDEO] fal status error: ${statusRes.status} - ${errorText}`);
    throw new Error(`fal.ai status error: ${statusRes.status}`);
  }

  const statusData = await statusRes.json();

  if (statusData.status === 'COMPLETED') {
    if (statusData.error) {
      return { status: 'FAILED', failure: statusData.error };
    }

    const resolvedResponseUrl = isAllowedFalQueueUrl(statusData.response_url)
      ? statusData.response_url
      : (typeof requestId === 'string' && requestId)
        ? getFallbackResponseUrl(requestId)
        : null;

    if (!resolvedResponseUrl) throw new Error('fal.ai response URL missing');

    const resultRes = await fetch(resolvedResponseUrl, { method: 'GET', headers: falHeaders });
    if (!resultRes.ok) {
      const errorText = await resultRes.text();
      console.error(`[VIDEO] fal result error: ${resultRes.status} - ${errorText}`);
      throw new Error(`fal.ai result error: ${resultRes.status}`);
    }

    const resultData = await resultRes.json();
    const videoUrl = resultData.video?.url ?? resultData.video_url ?? resultData.output?.video?.url ?? null;

    if (!videoUrl) return { status: 'FAILED', failure: 'fal.ai completed without a video URL' };
    return { status: 'SUCCEEDED', video_url: videoUrl };
  }

  if (statusData.status === 'FAILED') {
    return { status: 'FAILED', failure: statusData.error ?? 'Unknown error' };
  }

  return { status: 'PENDING', queue_position: statusData.queue_position ?? null };
}

/* ── Runway status handler ── */
async function handleRunwayStatus(runwayKey: string, requestId: string) {
  const statusRes = await fetch(`${RUNWAY_API_BASE}/tasks/${requestId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${runwayKey}`,
      'X-Runway-Version': '2024-11-06',
    },
  });

  if (!statusRes.ok) {
    const errorText = await statusRes.text();
    console.error(`[VIDEO] Runway status error: ${statusRes.status} - ${errorText}`);
    throw new Error(`Runway status error: ${statusRes.status}`);
  }

  const data = await statusRes.json();
  console.log(`[VIDEO] Runway task ${requestId}: status=${data.status}`);

  if (data.status === 'SUCCEEDED') {
    const videoUrl = data.output?.[0] ?? null;
    if (!videoUrl) return { status: 'FAILED', failure: 'Runway completed without a video URL' };
    return { status: 'SUCCEEDED', video_url: videoUrl };
  }

  if (data.status === 'FAILED') {
    return { status: 'FAILED', failure: data.failure ?? data.failureCode ?? 'Runway generation failed' };
  }

  // RUNNING, THROTTLED, PENDING
  return { status: 'PENDING', queue_position: null };
}

/* ── fal.ai submit ── */
async function submitFal(
  falKey: string,
  promptText: string,
  duration: number,
  aspectRatio: string,
  imageBase64?: string,
): Promise<{ requestId: string; statusUrl: string } | null> {
  const falHeaders = { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' };

  let submitUrl = FAL_SUBMIT_URL;
  const body: Record<string, unknown> = {
    prompt: promptText,
    duration: String(duration || 10),
    aspect_ratio: aspectRatio,
  };

  if (imageBase64) {
    submitUrl = 'https://queue.fal.run/fal-ai/kling-video/v2.5-turbo/pro/image-to-video';
    body.image_url = `data:image/jpeg;base64,${imageBase64}`;
  }

  console.log(`[VIDEO] Submitting to fal.ai: "${promptText.slice(0, 60)}..."`);

  try {
    const response = await fetch(submitUrl, {
      method: 'POST',
      headers: falHeaders,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[VIDEO] fal.ai submit error: ${response.status} - ${errorText}`);
      return null; // signal to try fallback
    }

    const data = await response.json();
    const nextRequestId = data.request_id;
    const nextStatusUrl = isAllowedFalQueueUrl(data.status_url)
      ? data.status_url
      : getFallbackStatusUrl(nextRequestId);

    return { requestId: nextRequestId, statusUrl: nextStatusUrl };
  } catch (e) {
    console.error('[VIDEO] fal.ai network error:', e);
    return null;
  }
}

/* ── Runway submit ── */
async function submitRunway(
  runwayKey: string,
  promptText: string,
  duration: number,
  aspectRatio: string,
  imageBase64?: string,
): Promise<{ requestId: string } | null> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${runwayKey}`,
    'Content-Type': 'application/json',
    'X-Runway-Version': '2024-11-06',
  };

  const body: Record<string, unknown> = {
    model: 'gen4_turbo',
    ratio: mapAspectToRunway(aspectRatio),
    duration: mapDurationToRunway(duration),
    promptText,
  };

  if (imageBase64) {
    body.promptImage = `data:image/jpeg;base64,${imageBase64}`;
  }

  console.log(`[VIDEO] Submitting to Runway fallback: "${promptText.slice(0, 60)}..."`);

  try {
    const response = await fetch(`${RUNWAY_API_BASE}/image_to_video`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[VIDEO] Runway submit error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log(`[VIDEO] Runway task created: ${data.id}`);
    return { requestId: data.id };
  } catch (e) {
    console.error('[VIDEO] Runway network error:', e);
    return null;
  }
}

/* ── KIE submit (Kling v2.5 turbo) ── */
async function submitKie(
  kieKey: string,
  model: string,
  promptText: string,
  duration: number,
  aspectRatio: string,
  imageUrl?: string,
): Promise<{ requestId: string } | null> {
  const resolvedModel = imageUrl
    ? (model.includes('image-to-video') ? model : KIE_I2V_MODEL)
    : (model.includes('text-to-video') ? model : KIE_T2V_MODEL);

  const input: Record<string, unknown> = {
    prompt: promptText.slice(0, 2500),
    duration: String(duration >= 10 ? 10 : 5),
  };
  if (imageUrl) {
    input.image_url = imageUrl;
  } else {
    input.aspect_ratio = aspectRatio;
  }

  console.log(`[VIDEO] Submitting to KIE: model=${resolvedModel} "${promptText.slice(0, 60)}..."`);

  try {
    const response = await fetch(`${KIE_API_BASE}/jobs/createTask`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${kieKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: resolvedModel, input }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.code !== 200 || !data?.data?.taskId) {
      console.error(`[VIDEO] KIE submit error: ${response.status} - ${JSON.stringify(data).slice(0, 400)}`);
      return null;
    }

    console.log(`[VIDEO] KIE task created: ${data.data.taskId}`);
    return { requestId: data.data.taskId };
  } catch (e) {
    console.error('[VIDEO] KIE network error:', e);
    return null;
  }
}

/* ── KIE status handler (common recordInfo) ── */
async function handleKieStatus(kieKey: string, requestId: string) {
  const res = await fetch(
    `${KIE_API_BASE}/jobs/recordInfo?taskId=${encodeURIComponent(requestId)}`,
    { method: 'GET', headers: { 'Authorization': `Bearer ${kieKey}` } },
  );
  if (!res.ok) {
    const t = await res.text();
    console.error(`[VIDEO] KIE status error: ${res.status} - ${t}`);
    throw new Error(`KIE status error: ${res.status}`);
  }
  const json = await res.json();
  const d = json?.data;
  const state = d?.state;
  console.log(`[VIDEO] KIE task ${requestId}: state=${state} progress=${d?.progress ?? '-'}`);

  if (state === 'success') {
    let videoUrl: string | null = null;
    try {
      const parsed = typeof d.resultJson === 'string' ? JSON.parse(d.resultJson) : d.resultJson;
      videoUrl = parsed?.resultUrls?.[0]
        ?? parsed?.videoUrl
        ?? parsed?.video_url
        ?? parsed?.videos?.[0]?.url
        ?? null;
    } catch { /* ignore */ }
    if (!videoUrl) return { status: 'FAILED', failure: 'KIE completed without a video URL' };
    return { status: 'SUCCEEDED', video_url: videoUrl };
  }

  if (state === 'fail') {
    return { status: 'FAILED', failure: d?.failMsg || d?.failCode || 'KIE generation failed' };
  }

  return { status: 'PENDING', queue_position: null };
}

/* ── Upload base64 image to public bucket for providers that need a URL ── */
async function uploadImageForProvider(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  imageBase64: string,
): Promise<string | null> {
  try {
    const bin = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));
    const path = `${userId}/video-input/${Date.now()}.jpg`;
    const { error } = await supabaseAdmin.storage
      .from('ai-generations')
      .upload(path, bin, { contentType: 'image/jpeg', upsert: true });
    if (error) {
      console.error('[VIDEO] image upload failed:', error.message);
      return null;
    }
    const { data } = supabaseAdmin.storage.from('ai-generations').getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch (e) {
    console.error('[VIDEO] image upload exception:', e);
    return null;
  }
}

/* ── Main handler ── */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const userId = user.id;

    const FAL_API_KEY = Deno.env.get('FAL_API_KEY');
    const RUNWAY_API_KEY = Deno.env.get('RUNWAY_API_KEY');
    const KIE_API_KEY = Deno.env.get('KIE_API_KEY');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { action, promptText, duration, requestId, statusUrl, aspectRatio, imageBase64, provider, mode } = await req.json();

    /* ── STATUS action ── */
    if (action === 'status') {
      const resolvedProvider: Provider =
        provider === 'runway' ? 'runway' : provider === 'kie' ? 'kie' : 'fal';

      let result: any;
      if (resolvedProvider === 'kie') {
        if (!KIE_API_KEY) throw new Error('KIE_API_KEY not configured');
        if (!requestId) throw new Error('requestId is required');
        result = await handleKieStatus(KIE_API_KEY, requestId);
      } else if (resolvedProvider === 'runway') {
        if (!RUNWAY_API_KEY) throw new Error('RUNWAY_API_KEY not configured');
        if (!requestId) throw new Error('requestId is required');
        result = await handleRunwayStatus(RUNWAY_API_KEY, requestId);
      } else {
        if (!FAL_API_KEY) throw new Error('FAL_API_KEY not configured');
        const falHeaders = { 'Authorization': `Key ${FAL_API_KEY}`, 'Content-Type': 'application/json' };
        result = await handleFalStatus(falHeaders, statusUrl, requestId);
      }

      // Persist on success: download from provider, upload to our bucket, insert row
      if (result?.status === 'SUCCEEDED' && result?.video_url && requestId) {
        try {
          // Idempotency: skip if already persisted for this task_id
          const { data: existing } = await supabaseAdmin
            .from('video_generations')
            .select('id, video_url')
            .eq('task_id', requestId)
            .eq('user_id', userId)
            .maybeSingle();

          if (existing?.video_url) {
            result.video_url = existing.video_url;
          } else {
            const videoRes = await fetch(result.video_url);
            if (videoRes.ok) {
              const bytes = new Uint8Array(await videoRes.arrayBuffer());
              const path = `videos/${userId}/${Date.now()}-${requestId}.mp4`;
              const { error: upErr } = await supabaseAdmin.storage
                .from('ai-generations')
                .upload(path, bytes, { contentType: 'video/mp4', upsert: true });
              if (upErr) {
                console.error('[VIDEO] persist upload failed:', upErr.message);
              } else {
                const { data: pub } = supabaseAdmin.storage.from('ai-generations').getPublicUrl(path);
                const permanentUrl = pub.publicUrl;
                result.video_url = permanentUrl;

                if (existing?.id) {
                  await supabaseAdmin.from('video_generations').update({
                    status: 'SUCCEEDED',
                    video_url: permanentUrl,
                  }).eq('id', existing.id);
                } else {
                  await supabaseAdmin.from('video_generations').insert({
                    user_id: userId,
                    task_id: requestId,
                    status: 'SUCCEEDED',
                    video_url: permanentUrl,
                    prompt: (promptText || '').toString().slice(0, 2000) || 'Video AI',
                    mode: mode || 'text_to_video',
                    aspect_ratio: aspectRatio || '16:9',
                    duration: duration || 10,
                  });
                }
                console.log(`[VIDEO] persisted ${requestId} → ${permanentUrl}`);
              }
            } else {
              console.error('[VIDEO] failed to fetch video for persist:', videoRes.status);
            }
          }
        } catch (e) {
          console.error('[VIDEO] persist exception:', (e as Error).message);
        }
      }

      return jsonResponse(result);
    }


    /* ── GENERATE action ── */
    if (action === 'generate') {
      if (!promptText) throw new Error('promptText is required');

      const VIDEO_LIMIT = 1;
      const WINDOW_SECS = 60;
      const windowStart = new Date(Date.now() - WINDOW_SECS * 1000).toISOString();

      const { count: recentCalls } = await supabaseAdmin
        .from('ai_rate_limits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('function_name', 'generate-video')
        .gte('called_at', windowStart);

      if ((recentCalls ?? 0) >= VIDEO_LIMIT) {
        return jsonResponse(
          {
            error: 'rate_limit_exceeded',
            message: `Máximo ${VIDEO_LIMIT} generación de vídeo por minuto. Espera unos segundos e inténtalo de nuevo.`,
            retryAfter: WINDOW_SECS,
          },
          429,
          { 'Retry-After': String(WINDOW_SECS) }
        );
      }

      // NOTE: rate-limit row is inserted AFTER a provider successfully accepts
      // the request (see below). Inserting it here would block the user for 60s
      // even when the generation failed and credits were refunded.

      const CREDITS_COST = await getOperationCost(supabaseAdmin, 'generate_video', 3);
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('available_credits')
        .eq('user_id', userId)
        .single();

      if (!profile || profile.available_credits < CREDITS_COST) {
        return jsonResponse({
          error: 'insufficient_credits',
          available: profile?.available_credits ?? 0,
          required: CREDITS_COST,
        }, 402);
      }

      await supabaseAdmin.from('profiles').update({
        available_credits: profile.available_credits - CREDITS_COST,
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId).eq('available_credits', profile.available_credits);

      await supabaseAdmin.from('credit_transactions').insert({
        user_id: userId,
        amount: -CREDITS_COST,
        type: 'usage',
        description: `Video AI: ${promptText.slice(0, 80)}`,
      });

      const refundCredits = async (reason: string) => {
        const { data: p } = await supabaseAdmin.from('profiles').select('available_credits').eq('user_id', userId).single();
        if (p) {
          await supabaseAdmin.from('profiles').update({
            available_credits: p.available_credits + CREDITS_COST,
            updated_at: new Date().toISOString(),
          }).eq('user_id', userId);

          await supabaseAdmin.from('credit_transactions').insert({
            user_id: userId,
            amount: CREDITS_COST,
            type: 'refund',
            description: `Reembolso: ${reason}`.slice(0, 200),
          });

          console.log(`[VIDEO] Refunded ${CREDITS_COST} credits to user ${userId}: ${reason}`);
        }
      };

      const resolvedAspectRatio = aspectRatio || '16:9';
      const resolvedDuration = duration || 10;

      // Read active providers from ai_provider_settings (priority asc).
      const { data: providerRows } = await supabaseAdmin
        .from('ai_provider_settings')
        .select('provider, model, priority, is_active')
        .eq('feature_key', 'video_generation')
        .eq('is_active', true)
        .order('priority', { ascending: true });

      // Fallback to legacy hardcoded sequence if no DB config exists.
      const providersToTry: Array<{ provider: string; model: string }> =
        providerRows && providerRows.length > 0
          ? providerRows.map((r: any) => ({ provider: String(r.provider), model: String(r.model || '') }))
          : [
              { provider: 'fal', model: 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video' },
              { provider: 'runway', model: 'gen4_turbo' },
            ];

      // If we have an input image, upload it once so KIE (URL-only) can consume it.
      let imageUrl: string | undefined;
      if (imageBase64) {
        const uploaded = await uploadImageForProvider(supabaseAdmin, userId, imageBase64);
        if (uploaded) imageUrl = uploaded;
      }

      for (const cfg of providersToTry) {
        const key = cfg.provider.toLowerCase();

        if ((key === 'kie' || key === 'kie_suno') && KIE_API_KEY) {
          console.log(`[VIDEO] Trying KIE provider (model=${cfg.model})`);
          const r = await submitKie(KIE_API_KEY, cfg.model, promptText, resolvedDuration, resolvedAspectRatio, imageUrl);
          if (r) {
            await supabaseAdmin.from('ai_rate_limits').insert({ user_id: userId, function_name: 'generate-video' });
            console.log(`[VIDEO] KIE task ${r.requestId}, ${CREDITS_COST} credits charged`);
            return jsonResponse({ requestId: r.requestId, statusUrl: null, provider: 'kie' });
          }
          continue;
        }

        if (key === 'fal' && FAL_API_KEY) {
          console.log('[VIDEO] Trying fal.ai provider');
          const r = await submitFal(FAL_API_KEY, promptText, resolvedDuration, resolvedAspectRatio, imageBase64);
          if (r) {
            await supabaseAdmin.from('ai_rate_limits').insert({ user_id: userId, function_name: 'generate-video' });
            console.log(`[VIDEO] fal.ai queue request: ${r.requestId}, ${CREDITS_COST} credits charged`);
            return jsonResponse({ requestId: r.requestId, statusUrl: r.statusUrl, provider: 'fal' });
          }
          continue;
        }

        if (key === 'runway' && RUNWAY_API_KEY) {
          console.log('[VIDEO] Trying Runway provider');
          const r = await submitRunway(RUNWAY_API_KEY, promptText, resolvedDuration, resolvedAspectRatio, imageBase64);
          if (r) {
            await supabaseAdmin.from('ai_rate_limits').insert({ user_id: userId, function_name: 'generate-video' });
            console.log(`[VIDEO] Runway task created: ${r.requestId}, ${CREDITS_COST} credits charged`);
            return jsonResponse({ requestId: r.requestId, statusUrl: null, provider: 'runway' });
          }
          continue;
        }

        console.warn(`[VIDEO] Skipping provider "${cfg.provider}" (unsupported or missing API key)`);
      }

      // All providers failed — refund
      await refundCredits('All video providers failed');
      return jsonResponse({ error: 'provider_unavailable' }, 200);
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error('[VIDEO] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});
