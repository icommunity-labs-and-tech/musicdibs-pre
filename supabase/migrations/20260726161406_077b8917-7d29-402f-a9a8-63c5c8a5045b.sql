-- Lock down profiles UPDATE: only allow safe columns for authenticated users
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (
  display_name,
  phone,
  language,
  billing_country,
  billing_country_updated_at,
  referral_source,
  referral_influencer,
  referral_detail,
  referral_set_at,
  last_active_at
) ON public.profiles TO authenticated;

CREATE POLICY "Users can update own profile safe fields"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Lock down ibs_signatures UPDATE: users cannot modify their own signature status.
-- All status transitions must go through service-role webhook handlers.
DROP POLICY IF EXISTS "Users can update own ibs signatures" ON public.ibs_signatures;
REVOKE UPDATE ON public.ibs_signatures FROM authenticated;