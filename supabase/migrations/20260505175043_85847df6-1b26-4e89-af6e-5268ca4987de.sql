
-- Restore 100 credits for user affected by webhook boot failure
UPDATE public.profiles
SET available_credits = available_credits + 100,
    updated_at = now()
WHERE user_id = '102bba1e-f097-44a5-a387-699eecda12b4';

INSERT INTO public.credit_transactions (user_id, amount, type, description)
VALUES (
  '102bba1e-f097-44a5-a387-699eecda12b4',
  100,
  'purchase',
  'Reparación manual: suscripción annual_100 (webhook stripe falló por error de import distributionWelcomeEmail)'
);
