ALTER TABLE public.ai_generations ADD COLUMN IF NOT EXISTS voice_profile_id text;

ALTER TABLE public.user_artist_profiles ADD COLUMN IF NOT EXISTS created_from_generation_id uuid;