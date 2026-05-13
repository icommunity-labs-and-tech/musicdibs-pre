-- Generate and store a fresh secret in vault for the sitemap resubmit cron
DO $$
DECLARE
  v_secret text;
BEGIN
  -- Only create if not already present
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'sitemap_resubmit_cron_secret') THEN
    v_secret := encode(gen_random_bytes(32), 'hex');
    PERFORM vault.create_secret(v_secret, 'sitemap_resubmit_cron_secret', 'Shared secret for resubmit-sitemap-gsc edge function');
  END IF;
END $$;

-- Reschedule the cron to read the secret from vault
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'resubmit-sitemap-gsc-daily';

SELECT cron.schedule(
  'resubmit-sitemap-gsc-daily',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kmwehyixenybegwhqljx.supabase.co/functions/v1/resubmit-sitemap-gsc',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sitemap_resubmit_cron_secret' LIMIT 1)
    ),
    body := jsonb_build_object('source', 'pg_cron', 'time', now())
  );
  $$
);

-- Return the secret value once so the agent can mirror it into Edge Function env
SELECT decrypted_secret AS cron_secret
FROM vault.decrypted_secrets
WHERE name = 'sitemap_resubmit_cron_secret'
LIMIT 1;