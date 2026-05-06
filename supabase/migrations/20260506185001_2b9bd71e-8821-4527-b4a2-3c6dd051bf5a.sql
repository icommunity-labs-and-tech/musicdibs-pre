-- Manual import of annual_100 subscription for bookingalandlc@gmail.com (migration)
INSERT INTO public.subscriptions (user_id, plan, tier, status, current_period_start, current_period_end, amount, currency)
VALUES (
  '85a615d2-a9a3-48d4-b50c-04d77016fe26',
  'Annual',
  'annual_100',
  'active',
  now(),
  now() + interval '1 year',
  60,
  'eur'
);

UPDATE public.profiles
SET subscription_plan = 'Annual',
    available_credits = COALESCE(available_credits, 0) + 120,
    updated_at = now()
WHERE user_id = '85a615d2-a9a3-48d4-b50c-04d77016fe26';

INSERT INTO public.credit_transactions (user_id, amount, type, description)
VALUES (
  '85a615d2-a9a3-48d4-b50c-04d77016fe26',
  120,
  'subscription',
  'Migración manual: suscripción anual annual_100 (legacy 120 créditos)'
);