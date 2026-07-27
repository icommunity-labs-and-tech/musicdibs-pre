
-- 1) ibs_signatures: split ALL policy into INSERT-only; block user UPDATE/DELETE
DROP POLICY IF EXISTS "Users can insert own ibs signatures" ON public.ibs_signatures;
CREATE POLICY "Users can insert own ibs signatures"
  ON public.ibs_signatures FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status IN ('pending','unverified'));

REVOKE UPDATE, DELETE ON public.ibs_signatures FROM authenticated;

-- 2) profiles: column-level UPDATE privileges (defense in depth alongside trigger)
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, phone, language, referral_source, referral_influencer, referral_detail, referral_set_at, last_active_at, updated_at)
  ON public.profiles TO authenticated;

-- 3) managed_artists: require consent before linking a registered account
DROP POLICY IF EXISTS "Manager can manage own artists" ON public.managed_artists;

CREATE POLICY "Manager can insert own artists (unlinked only)"
  ON public.managed_artists FOR INSERT TO authenticated
  WITH CHECK (
    manager_user_id = auth.uid()
    AND artist_user_id IS NULL
  );

CREATE POLICY "Manager can update own artists (cannot change link)"
  ON public.managed_artists FOR UPDATE TO authenticated
  USING (manager_user_id = auth.uid())
  WITH CHECK (
    manager_user_id = auth.uid()
    AND artist_user_id IS NOT DISTINCT FROM (
      SELECT ma.artist_user_id FROM public.managed_artists ma WHERE ma.id = managed_artists.id
    )
  );

CREATE POLICY "Manager can read own artists"
  ON public.managed_artists FOR SELECT TO authenticated
  USING (manager_user_id = auth.uid());

CREATE POLICY "Manager can delete own artists"
  ON public.managed_artists FOR DELETE TO authenticated
  USING (manager_user_id = auth.uid());
