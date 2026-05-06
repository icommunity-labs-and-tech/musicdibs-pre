UPDATE public.profiles
SET stripe_customer_id = 'cus_UT6pcRSeBp2O9G', updated_at = now()
WHERE user_id = '85a615d2-a9a3-48d4-b50c-04d77016fe26';

UPDATE public.subscriptions
SET stripe_customer_id = 'cus_UT6pcRSeBp2O9G',
    stripe_subscription_id = 'sub_1TUAbhFULeu7PzK6WXamEA02',
    updated_at = now()
WHERE user_id = '85a615d2-a9a3-48d4-b50c-04d77016fe26' AND status = 'active';