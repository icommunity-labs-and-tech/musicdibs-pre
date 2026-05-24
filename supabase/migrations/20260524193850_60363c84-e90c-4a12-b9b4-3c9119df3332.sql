
DO $$
DECLARE
  v_user_id uuid := '963e96f8-f446-4b5d-a254-ea3ceff684c4';
  v_current int;
  v_perm int;
  v_target int := 100;
  v_delta int;
BEGIN
  SELECT available_credits, COALESCE(permanent_credits,0)
    INTO v_current, v_perm
  FROM public.profiles WHERE user_id = v_user_id FOR UPDATE;

  v_delta := v_current - v_target;
  IF v_delta > 0 THEN
    UPDATE public.profiles
       SET available_credits = v_target, updated_at = now()
     WHERE user_id = v_user_id;

    INSERT INTO public.credit_transactions (user_id, amount, type, description)
    VALUES (
      v_user_id, -v_delta, 'plan_switch_reset',
      'Ajuste manual: cambio de plan Monthly → annual_100 — descartados ' || v_delta || ' créditos restantes del plan mensual anterior'
    );
  END IF;
END $$;
