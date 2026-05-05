UPDATE public.profiles
SET available_credits = available_credits + 2,
    updated_at = now()
WHERE user_id = '1a3b50d8-704e-4694-b9a4-13f89e133d46';

INSERT INTO public.credit_transactions (user_id, amount, type, description)
VALUES
  ('1a3b50d8-704e-4694-b9a4-13f89e133d46', 1, 'refund', 'Reembolso manual: obra cancelada por admin sin reembolso (registro pending)'),
  ('1a3b50d8-704e-4694-b9a4-13f89e133d46', 1, 'refund', 'Reembolso manual: obra cancelada por admin sin reembolso (registro pending)');