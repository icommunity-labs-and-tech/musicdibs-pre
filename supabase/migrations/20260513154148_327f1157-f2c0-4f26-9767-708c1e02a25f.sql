-- Enable required extensions for scheduled HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any previous version of the job (idempotent)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'resubmit-sitemap-gsc-daily';

-- Schedule: every day at 04:00 UTC, resubmit the sitemap to Google Search Console
SELECT cron.schedule(
  'resubmit-sitemap-gsc-daily',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kmwehyixenybegwhqljx.supabase.co/functions/v1/resubmit-sitemap-gsc',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.cron_secret', true)
    ),
    body := jsonb_build_object('source', 'pg_cron', 'time', now())
  );
  $$
);