
CREATE TABLE IF NOT EXISTS public.seo_keyword_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  db text NOT NULL,
  phrase text NOT NULL,
  position integer NOT NULL,
  volume integer,
  cpc numeric,
  url text,
  traffic_share numeric,
  captured_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (db, phrase, captured_date)
);

CREATE INDEX IF NOT EXISTS idx_seo_kw_snap_db_date ON public.seo_keyword_snapshots (db, captured_date DESC);
CREATE INDEX IF NOT EXISTS idx_seo_kw_snap_phrase ON public.seo_keyword_snapshots (db, phrase, captured_date DESC);

GRANT SELECT ON public.seo_keyword_snapshots TO authenticated;
GRANT ALL ON public.seo_keyword_snapshots TO service_role;

ALTER TABLE public.seo_keyword_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view seo snapshots"
ON public.seo_keyword_snapshots
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Daily snapshot cron (03:15 UTC)
DO $$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'CRON_SECRET'
  LIMIT 1;

  IF v_secret IS NULL THEN
    RAISE LOG '[seo-snapshot-cron] CRON_SECRET not in vault — cron not scheduled';
    RETURN;
  END IF;

  PERFORM cron.unschedule('seo-keyword-daily-snapshot')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'seo-keyword-daily-snapshot');

  PERFORM cron.schedule(
    'seo-keyword-daily-snapshot',
    '15 3 * * *',
    format($cron$
      SELECT net.http_post(
        url := 'https://kmwehyixenybegwhqljx.supabase.co/functions/v1/seo-dashboard',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', %L
        ),
        body := jsonb_build_object('mode', 'snapshot')
      );
    $cron$, v_secret)
  );
END $$;
