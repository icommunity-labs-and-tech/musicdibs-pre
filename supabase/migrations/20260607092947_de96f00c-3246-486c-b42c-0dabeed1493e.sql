
ALTER TABLE public.youtube_service_requests
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- Replace prior delete policy with an update policy so cancellation becomes a soft state change
DROP POLICY IF EXISTS users_delete_own_pending_youtube_requests ON public.youtube_service_requests;

DROP POLICY IF EXISTS users_cancel_own_pending_youtube_requests ON public.youtube_service_requests;
CREATE POLICY users_cancel_own_pending_youtube_requests
  ON public.youtube_service_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending_payment')
  WITH CHECK (auth.uid() = user_id AND status IN ('pending_payment','cancelled'));
