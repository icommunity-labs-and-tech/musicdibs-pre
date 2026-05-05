
INSERT INTO public.subscriptions (
  user_id, stripe_customer_id, plan, status, currency,
  current_period_start, current_period_end, tier, plan_type
) VALUES (
  '102bba1e-f097-44a5-a387-699eecda12b4',
  'cus_USi3he4ovvOgoR',
  'Annual',
  'active',
  'eur',
  now(),
  now() + interval '1 year',
  'annual_100',
  'annual'
)
ON CONFLICT DO NOTHING;
