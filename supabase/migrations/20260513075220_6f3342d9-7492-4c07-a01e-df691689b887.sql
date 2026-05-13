UPDATE public.works
SET status = 'failed',
    failure_reason = 'worker_oom_no_ibs_evidence',
    updated_at = now()
WHERE id IN ('98cca442-5a76-4dac-8b75-58ef15d53cf0','77abf662-5078-498b-891a-502505ad050f','e61471b2-c7bd-4c07-8f90-03af1f4547fc')
  AND status = 'processing'
  AND ibs_evidence_id IS NULL;