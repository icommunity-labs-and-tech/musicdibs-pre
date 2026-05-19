UPDATE public.profiles p
SET subscription_tier = sub.product_code, updated_at = now()
FROM (
  SELECT DISTINCT ON (user_id) user_id, product_code
  FROM public.orders
  WHERE product_type = 'annual' AND product_code IS NOT NULL
  ORDER BY user_id, created_at DESC
) sub
WHERE p.user_id = sub.user_id
  AND p.subscription_plan = 'Annual'
  AND (p.subscription_tier IS NULL OR p.subscription_tier = '');

UPDATE public.profiles
SET subscription_tier = 'monthly', updated_at = now()
WHERE subscription_plan = 'Monthly' AND (subscription_tier IS NULL OR subscription_tier = '');