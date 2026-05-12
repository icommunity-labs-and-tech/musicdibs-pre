
-- 1) Mark the 4 stuck drafts as failed
UPDATE public.works
   SET status='failed',
       failure_reason='never_reached_ibs_manual_admin_refund',
       updated_at=now()
 WHERE id IN (
   'd05d55f0-8fd7-40f7-8946-cf39dff77657',
   'f87d6f4e-1d9b-4436-b0c4-578d73cfe9a3',
   'd6bd1708-6054-401d-a7bf-a4f57d7939d2',
   '16644d3b-5211-4ecb-ab1e-259d7ad996d6'
 );

-- 2) Refund 1 credit per affected work (idempotent via work_id in description)
WITH to_refund AS (
  SELECT w.id AS work_id, w.user_id, w.title
  FROM public.works w
  WHERE w.status='failed'
    AND w.ibs_evidence_id IS NULL
    AND w.failure_reason IN ('abandoned_draft','never_reached_ibs_manual_admin_refund')
    AND EXISTS (
      SELECT 1 FROM public.credit_transactions ct
      WHERE ct.user_id=w.user_id AND ct.type='usage' AND ct.amount=-1
        AND ct.description='Registro: '||w.title
        AND ct.created_at BETWEEN w.created_at - interval '2 min' AND w.created_at + interval '5 min'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.credit_transactions ct
      WHERE ct.user_id=w.user_id AND ct.type='refund'
        AND ct.description LIKE '%'||w.id::text||'%'
    )
),
ins AS (
  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  SELECT user_id, 1, 'refund',
         'Reembolso manual: registro nunca llegó a iBS (work '||work_id::text||' — '||title||')'
  FROM to_refund
  RETURNING user_id
),
agg AS (
  SELECT user_id, COUNT(*)::int AS cnt FROM ins GROUP BY user_id
)
UPDATE public.profiles p
   SET available_credits = p.available_credits + a.cnt,
       updated_at = now()
  FROM agg a
 WHERE p.user_id = a.user_id;
