CREATE POLICY "Users can upload to enhance folder in ai-generations"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ai-generations'
  AND (storage.foldername(name))[1] = 'enhance'
  AND (storage.foldername(name))[2] = auth.uid()::text
);