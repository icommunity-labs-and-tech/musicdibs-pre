UPDATE public.works
SET status = 'failed',
    failure_reason = 'worker_oom_no_ibs_evidence',
    updated_at = now()
WHERE id = '881e7ffb-d4e6-43b4-8bd3-3432314ee152'
  AND status = 'processing'
  AND ibs_evidence_id IS NULL;