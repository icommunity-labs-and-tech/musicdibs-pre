-- Manual fix: usuario edwinchavez256@icloud.com pagó suscripción mensual (sub_1TW6yCFULeu7PzK6PZW4KQ0b, pi_3TW6yAFULeu7PzK60r2Z4olT) pero no se le acreditaron los 8 créditos del plan Monthly. Acreditarlos manualmente y registrar la transacción + suscripción.

DO $$
DECLARE
  v_user_id uuid := 'bc93af59-a9e1-4f0e-ac8f-11721305f482';
  v_credits int := 8;
  v_already_credited boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.credit_transactions
    WHERE user_id = v_user_id
      AND stripe_session_id = 'pi_3TW6yAFULeu7PzK60r2Z4olT'
  ) INTO v_already_credited;

  IF v_already_credited THEN
    RAISE NOTICE 'Already credited, skipping';
    RETURN;
  END IF;

  UPDATE public.profiles
  SET available_credits = COALESCE(available_credits, 0) + v_credits,
      subscription_plan = 'Monthly',
      stripe_customer_id = COALESCE(stripe_customer_id, 'cus_UV7CKvliUmLwni'),
      updated_at = now()
  WHERE user_id = v_user_id;

  INSERT INTO public.credit_transactions (user_id, amount, type, description, stripe_session_id)
  VALUES (
    v_user_id,
    v_credits,
    'purchase',
    'Compra plan monthly: +8 créditos (acreditación manual — webhook no procesó pi_3TW6yAFULeu7PzK60r2Z4olT / sub_1TW6yCFULeu7PzK6PZW4KQ0b)',
    'pi_3TW6yAFULeu7PzK60r2Z4olT'
  );

  INSERT INTO public.subscriptions (
    user_id, plan, tier, status, stripe_customer_id, stripe_subscription_id,
    current_period_start, current_period_end
  )
  VALUES (
    v_user_id, 'Monthly', 'monthly', 'active',
    'cus_UV7CKvliUmLwni', 'sub_1TW6yCFULeu7PzK6PZW4KQ0b',
    now(), now() + interval '1 month'
  )
  ON CONFLICT DO NOTHING;
END $$;