-- 1) Permitir a los usuarios leer sus propias órdenes
CREATE POLICY "Users can read own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2) Bucket instagram-creatives: SELECT propios
CREATE POLICY "Users can read own instagram creatives"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'instagram-creatives'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3) Bucket instagram-creatives: DELETE propios
CREATE POLICY "Users can delete own instagram creatives"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'instagram-creatives'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4) Bucket instagram-creatives: UPDATE propios
CREATE POLICY "Users can update own instagram creatives"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'instagram-creatives'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'instagram-creatives'
  AND (storage.foldername(name))[1] = auth.uid()::text
);