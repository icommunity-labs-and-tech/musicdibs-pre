ALTER TABLE public.user_artist_profiles
ADD CONSTRAINT user_artist_profiles_voice_profile_id_fkey
FOREIGN KEY (voice_profile_id) REFERENCES public.voice_profiles(id)
ON DELETE SET NULL;