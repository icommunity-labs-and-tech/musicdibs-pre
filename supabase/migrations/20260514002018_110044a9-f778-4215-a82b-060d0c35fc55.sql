-- Reverse duplicate cron refunds (trigger already refunded, cron added a 2nd one)
UPDATE public.profiles
SET available_credits = available_credits - 13,
    updated_at = now()
WHERE user_id = '85a615d2-a9a3-48d4-b50c-04d77016fe26';

UPDATE public.profiles
SET available_credits = available_credits - 1,
    updated_at = now()
WHERE user_id = 'b1c6b3bc-6407-4b5e-8bc0-4f7dbf00c177';

-- Annotate the duplicate refund transactions for audit trail
UPDATE public.credit_transactions
SET description = '[ANULADO duplicado] ' || description
WHERE id IN (
  '976cb5a5-81b2-482a-a0fc-cd7aa59aed2f','bf91e6ae-1e62-4472-9ac0-8032748ca7d6',
  '08c94da7-ca3d-4d69-b7e3-0a3930dfd701','bfe44c5d-6460-4c95-a967-7bc80ed2df56',
  '5c27c661-83b1-4df8-8c52-9f9038f8828b','848fb444-0fef-41ac-9213-5cc724e4de24',
  '4cc36cfd-94fb-4ee9-93c1-4e222c9d51e3','d4fc9525-c9c4-4599-971a-0287b0664ac8',
  '97ccdf6d-274e-4836-a504-cd710abcd18b','beccb2b5-9142-4850-a4fc-128948438d13',
  '68283b3e-9cf2-4b62-b849-9811289c47ff','0f6aebc3-0c22-4229-9cee-05d956d10324',
  'd252ad83-a5ed-4c49-9219-1de1bdecb478','35984858-d3ec-449c-a5fc-8d634a700bd2'
);