INSERT INTO public.feature_costs (feature_key, label, credit_cost)
VALUES ('promote_premium', 'Promoción premium', 25)
ON CONFLICT (feature_key) DO UPDATE
SET label = EXCLUDED.label,
    credit_cost = EXCLUDED.credit_cost;

DELETE FROM public.feature_costs
WHERE feature_key = 'promote_work';

UPDATE public.operation_pricing
SET operation_name = COALESCE(NULLIF(operation_name, ''), 'Promoción premium'),
    operation_label = COALESCE(NULLIF(operation_label, ''), 'Promoción premium'),
    credits_cost = 25,
    category = 'promo',
    is_active = true
WHERE operation_key = 'promote_premium';

DELETE FROM public.operation_pricing
WHERE operation_key = 'promote_work';