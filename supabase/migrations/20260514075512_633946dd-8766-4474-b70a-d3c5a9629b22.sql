-- Data fix: Alan DLC tenía kyc_status='verified' incorrecto.
-- Su firma sig_QQHtVyR45PCnsT8nYom9MC sigue 'created' en iBS (KYC sin completar),
-- por eso fallaban los registros con 500. Revertimos a 'pending' para que el guard
-- bloquee nuevos intentos hasta que complete KYC o cree nueva firma.
UPDATE public.profiles
SET kyc_status = 'pending', updated_at = now()
WHERE user_id = '85a615d2-a9a3-48d4-b50c-04d77016fe26'
  AND kyc_status = 'verified';