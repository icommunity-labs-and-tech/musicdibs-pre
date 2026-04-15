-- Remove the overly permissive public access policy on social-promo-videos
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Add user-scoped SELECT policy for social-promo-videos
CREATE POLICY "Users read own social promo videos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'social-promo-videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);