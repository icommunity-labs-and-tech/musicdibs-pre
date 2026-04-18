-- App settings table for global feature flags
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read app_settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage app_settings"
  ON public.app_settings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role full access app_settings"
  ON public.app_settings FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Insert the renewal billing flag (disabled by default for safety)
INSERT INTO public.app_settings (key, value)
VALUES ('subscription_billing_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Renewal log for the cron function
CREATE TABLE IF NOT EXISTS public.renewal_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  action text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_renewal_log_user_id ON public.renewal_log(user_id);
CREATE INDEX IF NOT EXISTS idx_renewal_log_created_at ON public.renewal_log(created_at DESC);

ALTER TABLE public.renewal_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read renewal_log"
  ON public.renewal_log FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role full access renewal_log"
  ON public.renewal_log FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);