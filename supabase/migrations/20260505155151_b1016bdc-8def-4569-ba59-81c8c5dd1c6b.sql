CREATE OR REPLACE FUNCTION public.notify_admin_alert_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_key text;
BEGIN
  IF NEW.severity NOT IN ('error','critical') THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
    WHERE name = 'email_queue_service_role_key'
    LIMIT 1;

    IF v_service_key IS NULL THEN
      RAISE LOG '[notify_admin_alert_email] vault secret missing — email skipped for alert %', NEW.id;
      RETURN NEW;
    END IF;

    PERFORM net.http_post(
      url := 'https://kmwehyixenybegwhqljx.supabase.co/functions/v1/notify-admin-alert',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'id', NEW.id,
        'source', NEW.source,
        'severity', NEW.severity,
        'message', NEW.message,
        'context', NEW.context
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[notify_admin_alert_email] failed for alert %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_alerts_notify ON public.admin_alerts;
CREATE TRIGGER trg_admin_alerts_notify
AFTER INSERT ON public.admin_alerts
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_alert_email();