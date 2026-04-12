
ALTER TABLE public.cancellation_surveys
ADD COLUMN IF NOT EXISTS additional_feedback text,
ADD COLUMN IF NOT EXISTS is_account_deletion boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS account_deleted_at timestamptz;

-- Allow authenticated users to insert their own cancellation surveys (needed for self-service deletion)
CREATE POLICY "Users can insert own cancellation surveys"
ON public.cancellation_surveys
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
