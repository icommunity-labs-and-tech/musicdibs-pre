
DO $$
DECLARE
  v_user uuid := '7dd09f8b-fb34-4ded-a1fc-a8a68c419cd2';
  v_ids uuid[] := ARRAY[
    '0de70965-6226-4738-9c53-496e2d3d8c0e',
    '97a10d76-8de0-47c1-932d-d50ef6d598b4',
    '11ce0d4e-c07c-4de2-8408-a5438c72c425',
    '6fdf6fa3-0971-44a9-a800-019d9ea74c2a'
  ]::uuid[];
BEGIN
  UPDATE public.works
     SET status = 'failed',
         failure_reason = 'never_reached_ibs_manual_admin_refund',
         updated_at = now()
   WHERE id = ANY(v_ids)
     AND user_id = v_user
     AND status = 'draft';

  UPDATE public.profiles
     SET available_credits = available_credits + 4,
         updated_at = now()
   WHERE user_id = v_user;

  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (v_user, 4, 'refund',
          'Reembolso manual: 4 registros nunca llegaron a iBS (works marcados failed)');
END $$;
