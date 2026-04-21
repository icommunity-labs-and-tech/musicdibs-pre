-- 1) Convertir buckets a privados (bloquea el listado del SDK público)
UPDATE storage.buckets SET public = false WHERE id IN ('blog-images', 'voice-samples', 'social-promo-images');

-- 2) blog-images: lectura pública por policy, escritura solo admin
DROP POLICY IF EXISTS "Public read blog-images" ON storage.objects;
CREATE POLICY "Public read blog-images"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'blog-images');

DROP POLICY IF EXISTS "Admins insert blog-images" ON storage.objects;
CREATE POLICY "Admins insert blog-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins update blog-images" ON storage.objects;
CREATE POLICY "Admins update blog-images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins delete blog-images" ON storage.objects;
CREATE POLICY "Admins delete blog-images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3) voice-samples: lectura pública por policy, escritura solo service_role
DROP POLICY IF EXISTS "Public read voice-samples" ON storage.objects;
CREATE POLICY "Public read voice-samples"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'voice-samples');

-- (no se crean policies INSERT/UPDATE/DELETE: service_role las salta por defecto)

-- 4) social-promo-images: lectura pública por policy, escritura solo del owner por carpeta
DROP POLICY IF EXISTS "Public read social-promo-images" ON storage.objects;
CREATE POLICY "Public read social-promo-images"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'social-promo-images');

DROP POLICY IF EXISTS "Users insert own social-promo-images" ON storage.objects;
CREATE POLICY "Users insert own social-promo-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'social-promo-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users update own social-promo-images" ON storage.objects;
CREATE POLICY "Users update own social-promo-images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'social-promo-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'social-promo-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users delete own social-promo-images" ON storage.objects;
CREATE POLICY "Users delete own social-promo-images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'social-promo-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);