-- Hacer públicos todos los buckets de assets generados por usuarios
UPDATE storage.buckets SET public = true 
WHERE id IN (
  'ai-generations',
  'social-promo-videos',
  'instagram-creatives',
  'youtube-thumbnails',
  'event-posters',
  'premium-promo-media'
);

-- Políticas de lectura pública para cada bucket (idempotente)
DO $$
DECLARE
  b TEXT;
  buckets TEXT[] := ARRAY[
    'ai-generations',
    'social-promo-videos',
    'instagram-creatives',
    'youtube-thumbnails',
    'event-posters',
    'premium-promo-media'
  ];
  policy_name TEXT;
BEGIN
  FOREACH b IN ARRAY buckets LOOP
    policy_name := 'Public read ' || b;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage' AND tablename = 'objects'
        AND policyname = policy_name
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON storage.objects FOR SELECT USING (bucket_id = %L)',
        policy_name, b
      );
    END IF;
  END LOOP;
END $$;