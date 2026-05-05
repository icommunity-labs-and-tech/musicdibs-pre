-- Admin alerts table
CREATE TABLE IF NOT EXISTS public.admin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  severity text NOT NULL DEFAULT 'warn' CHECK (severity IN ('info','warn','error','critical')),
  message text NOT NULL,
  context jsonb DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_alerts_unresolved ON public.admin_alerts (created_at DESC) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_admin_alerts_source ON public.admin_alerts (source, created_at DESC);

ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view alerts" ON public.admin_alerts;
CREATE POLICY "Admins can view alerts" ON public.admin_alerts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert alerts" ON public.admin_alerts;
CREATE POLICY "Admins can insert alerts" ON public.admin_alerts
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update alerts" ON public.admin_alerts;
CREATE POLICY "Admins can update alerts" ON public.admin_alerts
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Watchdog function: alerts if renewals cron hasn't logged activity in 25h
CREATE OR REPLACE FUNCTION public.check_renewals_cron_health()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_run timestamptz;
  v_recent_alert boolean;
BEGIN
  SELECT max(created_at) INTO v_last_run FROM public.renewal_log;

  -- Skip if there's already an unresolved cron alert in the last 25h
  SELECT EXISTS (
    SELECT 1 FROM public.admin_alerts
    WHERE source = 'renewals_cron'
      AND resolved = false
      AND created_at > now() - interval '25 hours'
  ) INTO v_recent_alert;

  IF v_recent_alert THEN RETURN; END IF;

  IF v_last_run IS NULL OR v_last_run < now() - interval '25 hours' THEN
    INSERT INTO public.admin_alerts (source, severity, message, context)
    VALUES (
      'renewals_cron',
      'critical',
      'El cron process-subscription-renewals no ha registrado actividad en las últimas 25 horas',
      jsonb_build_object('last_run', v_last_run, 'checked_at', now())
    );
  END IF;
END;
$$;

-- Schedule watchdog hourly
DO $$
BEGIN
  PERFORM cron.unschedule('renewals-watchdog');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'renewals-watchdog',
  '15 * * * *',
  $$ SELECT public.check_renewals_cron_health(); $$
);