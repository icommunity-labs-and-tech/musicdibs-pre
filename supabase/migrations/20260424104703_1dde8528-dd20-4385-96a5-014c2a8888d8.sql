UPDATE storage.buckets SET public = true WHERE id = 'social-promo-images';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public read social-promo-images'
  ) THEN
    CREATE POLICY "Public read social-promo-images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'social-promo-images');
  END IF;
END $$;