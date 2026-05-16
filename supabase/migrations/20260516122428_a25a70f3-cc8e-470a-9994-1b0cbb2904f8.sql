DO $$
DECLARE
  v_jobid int;
  v_service_key text;
BEGIN
  -- Get fresh service role key from vault
  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key'
  LIMIT 1;

  IF v_service_key IS NULL THEN
    RAISE EXCEPTION 'vault secret email_queue_service_role_key not found';
  END IF;

  -- Unschedule any existing job with the same name
  FOR v_jobid IN
    SELECT jobid FROM cron.job WHERE jobname = 'process-subscription-renewals'
  LOOP
    PERFORM cron.unschedule(v_jobid);
  END LOOP;

  -- Reschedule with fresh service role key
  PERFORM cron.schedule(
    'process-subscription-renewals',
    '0 6 * * *',
    format($job$
      SELECT net.http_post(
        url := 'https://kmwehyixenybegwhqljx.supabase.co/functions/v1/process-subscription-renewals',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer %s'
        ),
        body := '{}'::jsonb
      );
    $job$, v_service_key)
  );
END $$;