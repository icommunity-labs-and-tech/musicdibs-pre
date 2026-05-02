
-- 1. Fix social-promo-videos upload: enforce path ownership scoping
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;

CREATE POLICY "Users can upload own social-promo-videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'social-promo-videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own social-promo-videos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'social-promo-videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'social-promo-videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own social-promo-videos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'social-promo-videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. _phpass_backup: RLS enabled but no policies. Lock it down to service_role only.
CREATE POLICY "phpass_backup service role only"
ON public._phpass_backup FOR ALL
TO public
USING (false)
WITH CHECK (false);

-- 3. cancellation_tracking: add admin SELECT policy (admins currently can't read via RLS)
CREATE POLICY "Admins can read all cancellation tracking"
ON public.cancellation_tracking FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role full access cancellation_tracking"
ON public.cancellation_tracking FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Revoke EXECUTE on sensitive SECURITY DEFINER functions from anon/authenticated.
-- These should only be callable by service_role (from Edge Functions).
REVOKE EXECUTE ON FUNCTION public.set_user_password_hash(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.upgrade_user_password(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_auth_data(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_phpass(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wp_login_verify_and_upgrade(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_free_downloads(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_last_active_on_credit_use() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_free_downloads_on_reactivation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
