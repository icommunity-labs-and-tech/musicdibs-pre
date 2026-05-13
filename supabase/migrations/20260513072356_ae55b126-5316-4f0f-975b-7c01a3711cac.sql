-- 1) Marcar las 14 obras stuck como failed (el trigger auto_refund_on_work_failure
-- reembolsará 1 crédito a cada usuario afectado de forma automática e idempotente)
UPDATE public.works
SET status = 'failed',
    failure_reason = 'worker_oom_no_ibs_evidence',
    updated_at = now()
WHERE status = 'processing'
  AND ibs_evidence_id IS NULL
  AND created_at >= '2026-05-12 23:50:00+00'
  AND created_at < '2026-05-13 04:00:00+00';

-- 2) Extender el cron de obras abandonadas para que también detecte
--    los stuck en 'processing' sin ibs_evidence_id (>30 min)
CREATE OR REPLACE FUNCTION public.mark_abandoned_drafts_as_failed()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_drafts_count   integer := 0;
  v_stuck_count    integer := 0;
  v_total          integer := 0;
BEGIN
  -- (a) Drafts abandonados (>2h sin evidencia)
  WITH updated AS (
    UPDATE public.works
       SET status = 'failed',
           failure_reason = 'abandoned_draft',
           updated_at = now()
     WHERE status = 'draft'
       AND ibs_evidence_id IS NULL
       AND created_at < now() - interval '2 hours'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_drafts_count FROM updated;

  -- (b) Stuck en processing sin ibs_evidence_id (>30 min) — el caso del worker OOM
  WITH updated AS (
    UPDATE public.works
       SET status = 'failed',
           failure_reason = 'worker_oom_no_ibs_evidence',
           updated_at = now()
     WHERE status = 'processing'
       AND ibs_evidence_id IS NULL
       AND created_at < now() - interval '30 minutes'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_stuck_count FROM updated;

  v_total := v_drafts_count + v_stuck_count;

  RAISE LOG '[mark_abandoned_drafts_as_failed] failed: % drafts + % stuck processing (refunds via trigger auto_refund_on_work_failure)',
    v_drafts_count, v_stuck_count;

  -- Alertar admin si hubo stuck processing (es un síntoma de problema infra)
  IF v_stuck_count > 0 THEN
    INSERT INTO public.admin_alerts (source, severity, message, context)
    VALUES (
      'ibs_certification',
      'warn',
      format('Cron limpió %s obra(s) atascadas en processing sin evidencia iBS', v_stuck_count),
      jsonb_build_object('stuck_count', v_stuck_count, 'drafts_count', v_drafts_count)
    );
  END IF;

  RETURN v_total;
END;
$function$;