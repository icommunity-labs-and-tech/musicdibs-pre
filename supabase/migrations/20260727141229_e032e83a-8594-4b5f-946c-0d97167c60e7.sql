-- Allow managers to unlink (set artist_user_id to NULL) while still preventing
-- them from linking/switching to a different account without artist consent.
DROP POLICY IF EXISTS "Manager can update own artists (cannot change link)" ON public.managed_artists;

CREATE POLICY "Manager can update own artists (safe link changes)"
ON public.managed_artists
FOR UPDATE
TO authenticated
USING (manager_user_id = auth.uid())
WITH CHECK (
  manager_user_id = auth.uid()
  AND (
    -- Unchanged link
    artist_user_id IS NOT DISTINCT FROM (
      SELECT ma.artist_user_id FROM public.managed_artists ma WHERE ma.id = managed_artists.id
    )
    -- Or explicit unlink
    OR artist_user_id IS NULL
  )
);