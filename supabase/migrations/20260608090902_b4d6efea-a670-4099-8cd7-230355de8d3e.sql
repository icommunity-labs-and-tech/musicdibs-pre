
CREATE OR REPLACE FUNCTION public.get_email_queue_service_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE v text;
BEGIN
  SELECT decrypted_secret INTO v
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key'
  LIMIT 1;
  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.get_email_queue_service_key() FROM PUBLIC, anon, authenticated;

-- Audit: insert a row showing whether the key resolves
CREATE TABLE IF NOT EXISTS public._email_cron_debug (id bigserial PRIMARY KEY, ts timestamptz DEFAULT now(), info text);
GRANT ALL ON public._email_cron_debug TO service_role;
INSERT INTO public._email_cron_debug(info)
SELECT 'key_len=' || COALESCE(length(public.get_email_queue_service_key())::text, 'null')
   || ' prefix=' || COALESCE(LEFT(public.get_email_queue_service_key(), 10), 'null');

SELECT cron.unschedule('process-email-queue-cron');

SELECT cron.schedule(
  'process-email-queue-cron',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kmwehyixenybegwhqljx.supabase.co/functions/v1/process-email-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.get_email_queue_service_key()
    ),
    body := '{}'::jsonb
  );
  $$
);
