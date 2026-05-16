DO $$
DECLARE
  v_service_key text;
BEGIN
  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key' LIMIT 1;

  PERFORM net.http_post(
    url := 'https://kmwehyixenybegwhqljx.supabase.co/functions/v1/process-subscription-renewals',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := '{"dry_run": true}'::jsonb
  );
END $$;