
-- Fix info@musicdibs.com subscription_plan to Free
UPDATE public.profiles
SET subscription_plan = 'Free', updated_at = now()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'info@musicdibs.com' LIMIT 1
);
