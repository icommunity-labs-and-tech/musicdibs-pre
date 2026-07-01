
-- Exceptions and log tables for storage cleanup policy
CREATE TABLE IF NOT EXISTS public.asset_cleanup_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_cleanup_exceptions TO authenticated;
GRANT ALL ON public.asset_cleanup_exceptions TO service_role;
ALTER TABLE public.asset_cleanup_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage cleanup exceptions" ON public.asset_cleanup_exceptions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.asset_cleanup_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL,
  user_id UUID,
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  size_bytes BIGINT,
  action TEXT NOT NULL, -- notified_14d | notified_final | moved_to_trash | purged | skipped_exception | skipped_active
  reason TEXT,
  mode TEXT NOT NULL,   -- dry_run | notify | purge
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asset_cleanup_log_run ON public.asset_cleanup_log(run_id);
CREATE INDEX IF NOT EXISTS idx_asset_cleanup_log_user ON public.asset_cleanup_log(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_cleanup_log_bucket ON public.asset_cleanup_log(bucket);
CREATE INDEX IF NOT EXISTS idx_asset_cleanup_log_action_time ON public.asset_cleanup_log(action, executed_at);
GRANT SELECT ON public.asset_cleanup_log TO authenticated;
GRANT ALL ON public.asset_cleanup_log TO service_role;
ALTER TABLE public.asset_cleanup_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view cleanup log" ON public.asset_cleanup_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
