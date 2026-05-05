CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remove existing job if any (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('process-subscription-renewals');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'process-subscription-renewals',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kmwehyixenybegwhqljx.supabase.co/functions/v1/process-subscription-renewals',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imttd2VoeWl4ZW55YmVnd2hxbGp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ0MTAzNCwiZXhwIjoyMDkwMDE3MDM0fQ.EVluBuFrV7MgQ4L0GGaOxg-U2tP_M8m07vUNpJfJpR0'
    ),
    body := '{}'::jsonb
  );
  $$
);