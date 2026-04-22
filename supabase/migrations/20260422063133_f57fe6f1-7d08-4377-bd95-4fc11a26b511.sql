-- Bucket privado para subidas de Promo Premium (audio + vídeo/imagen)
INSERT INTO storage.buckets (id, name, public)
VALUES ('premium-promo-media', 'premium-promo-media', false)
ON CONFLICT (id) DO NOTHING;

-- Policies: cada usuario solo accede a su carpeta {userId}/...
DROP POLICY IF EXISTS "Users can upload own premium promo media" ON storage.objects;
CREATE POLICY "Users can upload own premium promo media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'premium-promo-media'
  AND (storage.foldername(name))[1] = 'promotions'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can read own premium promo media" ON storage.objects;
CREATE POLICY "Users can read own premium promo media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'premium-promo-media'
  AND (storage.foldername(name))[1] = 'promotions'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete own premium promo media" ON storage.objects;
CREATE POLICY "Users can delete own premium promo media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'premium-promo-media'
  AND (storage.foldername(name))[1] = 'promotions'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Admins pueden leer todo (para revisar promos)
DROP POLICY IF EXISTS "Admins can read all premium promo media" ON storage.objects;
CREATE POLICY "Admins can read all premium promo media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'premium-promo-media'
  AND has_role(auth.uid(), 'admin'::app_role)
);