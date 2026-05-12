
CREATE OR REPLACE FUNCTION public.mark_abandoned_drafts_as_failed()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
  v_refunded integer := 0;
BEGIN
  -- 1) Mark abandoned drafts (>2h, no iBS evidence) as failed
  WITH updated AS (
    UPDATE public.works
       SET status = 'failed',
           failure_reason = 'abandoned_draft',
           updated_at = now()
     WHERE status = 'draft'
       AND ibs_evidence_id IS NULL
       AND created_at < now() - interval '2 hours'
    RETURNING id, user_id, title, created_at
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  -- 2) Refund 1 credit per work that had a matching debit and no prior refund
  WITH to_refund AS (
    SELECT w.id AS work_id, w.user_id, w.title
    FROM public.works w
    WHERE w.status = 'failed'
      AND w.failure_reason = 'abandoned_draft'
      AND w.ibs_evidence_id IS NULL
      AND w.updated_at > now() - interval '5 minutes'
      AND EXISTS (
        SELECT 1 FROM public.credit_transactions ct
        WHERE ct.user_id = w.user_id
          AND ct.type = 'usage'
          AND ct.amount = -1
          AND ct.description = 'Registro: ' || w.title
          AND ct.created_at BETWEEN w.created_at - interval '2 min' AND w.created_at + interval '5 min'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.credit_transactions ct
        WHERE ct.user_id = w.user_id
          AND ct.type = 'refund'
          AND ct.description LIKE '%' || w.id::text || '%'
      )
  ),
  ins AS (
    INSERT INTO public.credit_transactions (user_id, amount, type, description)
    SELECT user_id, 1, 'refund',
           'Reembolso automático (abandoned_draft): work ' || work_id::text || ' — ' || title
    FROM to_refund
    RETURNING user_id
  ),
  agg AS (
    SELECT user_id, COUNT(*)::int AS cnt FROM ins GROUP BY user_id
  ),
  upd AS (
    UPDATE public.profiles p
       SET available_credits = p.available_credits + a.cnt,
           updated_at = now()
      FROM agg a
     WHERE p.user_id = a.user_id
    RETURNING a.cnt
  )
  SELECT COALESCE(SUM(cnt), 0) INTO v_refunded FROM upd;

  RAISE LOG '[mark_abandoned_drafts_as_failed] marked % drafts as failed, refunded % credits',
    v_count, v_refunded;
  RETURN v_count;
END;
$function$;
