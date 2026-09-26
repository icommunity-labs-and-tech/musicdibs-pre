ALTER TABLE public.google_ads_conversion_uploads ALTER COLUMN click_id_type DROP NOT NULL;
ALTER TABLE public.google_ads_conversion_uploads ALTER COLUMN click_id DROP NOT NULL;
ALTER TABLE public.google_ads_conversion_uploads ADD COLUMN IF NOT EXISTS hashed_email text;
ALTER TABLE public.google_ads_conversion_uploads DROP CONSTRAINT google_ads_conversion_uploads_click_id_type_check;
ALTER TABLE public.google_ads_conversion_uploads ADD CONSTRAINT google_ads_conversion_uploads_click_id_type_check CHECK (click_id_type IS NULL OR click_id_type IN ('gclid','gbraid','wbraid'));
ALTER TABLE public.google_ads_conversion_uploads ADD CONSTRAINT google_ads_conversion_uploads_identifier_check CHECK (click_id IS NOT NULL OR hashed_email IS NOT NULL);