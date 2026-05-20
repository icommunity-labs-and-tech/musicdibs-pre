
UPDATE public.profiles
SET permanent_credits = available_credits,
    updated_at = now()
WHERE permanent_credits > available_credits;
