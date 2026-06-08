
SELECT cron.unschedule('process-email-queue-cron');

SELECT cron.schedule(
  'process-email-queue-cron',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kmwehyixenybegwhqljx.supabase.co/functions/v1/process-email-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
