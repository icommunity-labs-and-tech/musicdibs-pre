import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const secret = req.headers.get('x-cron-secret');
  if (secret !== Deno.env.get('CRON_SECRET')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // ── NUEVO: Actualizar status de vídeos pendientes en background ──────────
  const videoStats = { checked: 0, succeeded: 0, failed: 0 };
  try {
    const { data: pendingVideos } = await supabase
      .from('video_generations')
      .select('id, task_id, user_id')
      .in('status', ['PENDING', 'RUNNING'])
      .not('task_id', 'is', null)
      .order('created_at', { ascending: true })
      .limit(20); // Máximo 20 por ejecución para no saturar

    for (const video of (pendingVideos || [])) {
      videoStats.checked++;
      try {
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
        const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

        const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-video`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({ action: 'status', taskId: video.task_id }),
        });

        if (!res.ok) continue;
        const data = await res.json();
        const status = data.status; // 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'

        if (status === 'SUCCEEDED') {
          videoStats.succeeded++;
          await supabase.from('video_generations').update({
            status: 'SUCCEEDED',
            video_url: data.videoUrl || data.video_url || null,
            merged_url: data.mergedUrl || data.merged_url || null,
            updated_at: new Date().toISOString(),
          }).eq('id', video.id);
          console.log(`[VIDEO-CRON] SUCCEEDED: ${video.id} taskId=${video.task_id}`);
        } else if (status === 'FAILED') {
          videoStats.failed++;
          await supabase.from('video_generations').update({
            status: 'FAILED',
            failure_reason: data.error || data.failureReason || 'Generation failed',
            updated_at: new Date().toISOString(),
          }).eq('id', video.id);
          console.log(`[VIDEO-CRON] FAILED: ${video.id} reason=${data.error}`);
        } else {
          // Sigue procesando — actualizar updated_at para tracking
          await supabase.from('video_generations').update({
            status: status || 'RUNNING',
            updated_at: new Date().toISOString(),
          }).eq('id', video.id);
        }
      } catch (e) {
        console.error(`[VIDEO-CRON] Error checking video ${video.id}:`, e);
      }
    }
    console.log('[VIDEO-CRON] Done:', videoStats);
  } catch (e) {
    console.error('[VIDEO-CRON] Fatal error in video polling:', e);
  }

  // ── LÓGICA EXISTENTE: library status ─────────────────────────────────────
  const stats = { active: 0, warning: 0, restricted: 0, pending_deletion: 0, queued_for_deletion: 0, deleted: 0 };

  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, subscription_plan, available_credits, last_active_at, library_status');

  for (const profile of (profiles || [])) {
    const plan = profile.subscription_plan;
    const credits = profile.available_credits ?? 0;
    const lastActive = profile.last_active_at ? new Date(profile.last_active_at) : new Date();
    const daysInactive = Math.floor((Date.now() - lastActive.getTime()) / 86400000);

    let newStatus = 'active';
    if (!(plan === 'Annual' || plan === 'Monthly' || credits > 0)) {
      if (daysInactive < 30) newStatus = 'warning';
      else if (daysInactive < 90) newStatus = 'restricted';
      else newStatus = 'pending_deletion';
    }

    stats[newStatus as keyof typeof stats]++;

    if (newStatus !== profile.library_status) {
      await supabase.from('profiles').update({
        library_status: newStatus,
        library_status_since: new Date().toISOString(),
      }).eq('user_id', profile.user_id);
      console.log(`[LIBRARY-CRON] ${profile.user_id}: ${profile.library_status} → ${newStatus} (${daysInactive}d inactivo)`);
    }

    if (newStatus === 'pending_deletion') {
      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + 30);

      const { data: audioAssets } = await supabase.from('ai_generations').select('id, audio_url').eq('user_id', profile.user_id);
      for (const asset of (audioAssets || [])) {
        const { data: existing } = await supabase.from('library_deletion_queue').select('id').eq('asset_id', asset.id).eq('status', 'scheduled').maybeSingle();
        if (!existing) {
          await supabase.from('library_deletion_queue').insert({ user_id: profile.user_id, asset_type: 'audio', asset_id: asset.id, storage_path: asset.audio_url, scheduled_deletion_at: deletionDate.toISOString(), status: 'scheduled' });
          stats.queued_for_deletion++;
        }
      }

      const { data: videoAssets } = await supabase.from('video_generations').select('id, video_url').eq('user_id', profile.user_id).eq('status', 'COMPLETED');
      for (const asset of (videoAssets || [])) {
        const { data: existing } = await supabase.from('library_deletion_queue').select('id').eq('asset_id', asset.id).eq('status', 'scheduled').maybeSingle();
        if (!existing) {
          await supabase.from('library_deletion_queue').insert({ user_id: profile.user_id, asset_type: 'video', asset_id: asset.id, storage_path: asset.video_url, scheduled_deletion_at: deletionDate.toISOString(), status: 'scheduled' });
          stats.queued_for_deletion++;
        }
      }
    }

    const { data: toDelete } = await supabase.from('library_deletion_queue').select('*').eq('user_id', profile.user_id).eq('status', 'scheduled').lte('scheduled_deletion_at', new Date().toISOString());
    for (const item of (toDelete || [])) {
      if (item.asset_type === 'audio') await supabase.from('ai_generations').delete().eq('id', item.asset_id);
      else if (item.asset_type === 'video') await supabase.from('video_generations').delete().eq('id', item.asset_id);
      await supabase.from('library_deletion_queue').update({ status: 'deleted', deleted_at: new Date().toISOString() }).eq('id', item.id);
      stats.deleted++;
      console.log(`[LIBRARY-CRON] Deleted asset ${item.asset_id} (${item.asset_type}) for user ${item.user_id}`);
    }
  }

  console.log('[LIBRARY-CRON] Done:', stats);
  return new Response(JSON.stringify({ success: true, stats, videoStats }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
