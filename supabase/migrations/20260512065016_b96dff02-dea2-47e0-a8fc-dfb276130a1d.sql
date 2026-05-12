-- 1. Add failure_reason column to works
ALTER TABLE public.works ADD COLUMN IF NOT EXISTS failure_reason text;

-- 2. Function to mark abandoned drafts as failed
CREATE OR REPLACE FUNCTION public.mark_abandoned_drafts_as_failed()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH updated AS (
    UPDATE public.works
    SET status = 'failed',
        failure_reason = 'abandoned_draft',
        updated_at = now()
    WHERE status = 'draft'
      AND created_at < now() - interval '2 hours'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  RAISE LOG '[mark_abandoned_drafts_as_failed] marked % drafts as failed', v_count;
  RETURN v_count;
END;
$$;

-- 3. Ensure pg_cron extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- 4. Unschedule existing job if any (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('mark-abandoned-drafts-hourly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5. Schedule hourly job (no HTTP — direct SQL, no secrets needed)
SELECT cron.schedule(
  'mark-abandoned-drafts-hourly',
  '0 * * * *',
  $$ SELECT public.mark_abandoned_drafts_as_failed(); $$
);