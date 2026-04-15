ALTER TABLE public.premium_social_promotions
  ADD COLUMN IF NOT EXISTS audio_file_path text,
  ADD COLUMN IF NOT EXISTS media_file_type text;