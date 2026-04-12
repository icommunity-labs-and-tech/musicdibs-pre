-- Fix 2 stuck works for info@musicdibs.com
UPDATE public.works 
SET status = 'failed', updated_at = now() 
WHERE id IN ('3c4a52c7-f54a-448a-bc8f-899c06e0d591', '522bf364-b575-4a9c-b525-f06f6f5a3183') 
AND status = 'processing';

-- Refund 2 credits  
UPDATE public.profiles 
SET available_credits = available_credits + 2, updated_at = now()
WHERE user_id = (SELECT user_id FROM public.works WHERE id = '3c4a52c7-f54a-448a-bc8f-899c06e0d591');

-- Log the refund transactions
INSERT INTO public.credit_transactions (user_id, amount, type, description)
SELECT user_id, 1, 'refund', 'Reembolso por fallo iBS: Laberinto digital (corrección manual)'
FROM public.works 
WHERE id = '3c4a52c7-f54a-448a-bc8f-899c06e0d591';

INSERT INTO public.credit_transactions (user_id, amount, type, description)
SELECT user_id, 1, 'refund', 'Reembolso por fallo iBS: Laberinto digital (corrección manual)'
FROM public.works 
WHERE id = '522bf364-b575-4a9c-b525-f06f6f5a3183';

-- Update pending registrations count will auto-correct since dashboard queries by status