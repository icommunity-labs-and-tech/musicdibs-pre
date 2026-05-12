
DO $$
DECLARE
  r RECORD;
  failed_ids uuid[] := ARRAY[
    '277546a2-7a32-4f87-b52a-a9d237e2b8b5',
    'b194d647-27b3-4a6a-9f86-44ed2516d504',
    'c2e0ee9f-9ae2-4ed5-a207-15ad6196dbf0',
    'd3404c07-e5b7-45e1-b920-5fc44538efb1',
    'd76af8a3-01f8-4ccd-aa8b-11d56b1bca17'
  ]::uuid[];
BEGIN
  FOR r IN
    SELECT w.id, w.user_id, w.title
    FROM public.works w
    WHERE w.id = ANY(failed_ids)
      AND w.status = 'failed'
      AND w.ibs_evidence_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.credit_transactions ct
        WHERE ct.user_id = w.user_id
          AND ct.type = 'refund'
          AND ct.description LIKE '%' || w.id::text || '%'
      )
      AND EXISTS (
        SELECT 1 FROM public.credit_transactions ct
        WHERE ct.user_id = w.user_id
          AND ct.type = 'usage'
          AND ct.amount = -1
          AND ct.description = 'Registro: ' || w.title
          AND ct.created_at BETWEEN w.created_at - interval '2 min' AND w.created_at + interval '5 min'
      )
  LOOP
    UPDATE public.profiles
       SET available_credits = available_credits + 1,
           updated_at = now()
     WHERE user_id = r.user_id;

    INSERT INTO public.credit_transactions (user_id, amount, type, description)
    VALUES (
      r.user_id,
      1,
      'refund',
      'Reembolso manual (edge function falló tras descuento, sin refund automático): work ' || r.id::text || ' — ' || r.title
    );

    UPDATE public.works
       SET failure_reason = 'edge_function_crash_after_credit_deduction_manual_refund',
           updated_at = now()
     WHERE id = r.id;

    RAISE LOG 'Refunded 1 credit to user % for failed work % (%)', r.user_id, r.id, r.title;
  END LOOP;
END $$;
