ALTER TABLE public.api_cost_config ADD COLUMN IF NOT EXISTS api_model text;

UPDATE public.api_cost_config SET api_model = CASE feature_key
  WHEN 'edit_audio'             THEN 'eleven-music-v1'
  WHEN 'enhance_audio'          THEN 'auphonic-production'
  WHEN 'generate_audio'         THEN 'eleven-music-v1'
  WHEN 'generate_audio_song'    THEN 'eleven-music-v1'
  WHEN 'generate_cover'         THEN 'fal-ai/flux-pro'
  WHEN 'generate_lyrics'        THEN 'claude-haiku-4-5-20251001'
  WHEN 'generate_press_release' THEN 'claude-haiku-4-5-20251001'
  WHEN 'generate_video'         THEN 'fal-ai/ltx-video'
  WHEN 'generate_vocal_track'   THEN 'eleven-multilingual-v2'
  WHEN 'improve_prompt'         THEN 'gemini-2.5-flash (fallback claude-haiku-4-5)'
  WHEN 'promote_work'           THEN 'fal-ai/flux-pro + claude-haiku-4-5'
  WHEN 'register_work'          THEN 'ibs-blockchain'
  ELSE api_model
END
WHERE api_model IS NULL OR api_model = '';