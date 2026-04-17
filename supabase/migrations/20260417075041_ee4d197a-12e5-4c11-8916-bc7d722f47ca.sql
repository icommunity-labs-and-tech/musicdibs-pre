-- Añadir columna model_name para mostrar el modelo LLM/IA usado por cada operación
ALTER TABLE public.operation_pricing
ADD COLUMN IF NOT EXISTS model_name TEXT;

COMMENT ON COLUMN public.operation_pricing.model_name IS 'Nombre del modelo de IA/LLM utilizado por la operación (ej: claude-haiku-4-5-20251001, fal-ai/nano-banana-pro)';

-- Rellenar el modelo para cada operación basado en el código real de las Edge Functions
UPDATE public.operation_pricing SET model_name = 'claude-haiku-4-5-20251001' WHERE operation_key = 'generate_lyrics';
UPDATE public.operation_pricing SET model_name = 'claude-haiku-4-5-20251001' WHERE operation_key = 'generate_press_release';
UPDATE public.operation_pricing SET model_name = 'gemini-2.5-flash (fallback: claude-haiku-4-5)' WHERE operation_key = 'improve_prompt';
UPDATE public.operation_pricing SET model_name = 'iBS Blockchain' WHERE operation_key = 'register_work';
UPDATE public.operation_pricing SET model_name = '—' WHERE operation_key = 'distribute_music';
UPDATE public.operation_pricing SET model_name = 'ElevenLabs Music API' WHERE operation_key = 'generate_audio';
UPDATE public.operation_pricing SET model_name = 'ElevenLabs Music API' WHERE operation_key = 'generate_audio_song';
UPDATE public.operation_pricing SET model_name = 'ElevenLabs Music API' WHERE operation_key = 'edit_audio';
UPDATE public.operation_pricing SET model_name = 'claude-haiku-4-5 + ElevenLabs TTS Multilingual v2' WHERE operation_key = 'generate_vocal_track';
UPDATE public.operation_pricing SET model_name = 'Plantillas curadas (sin LLM)' WHERE operation_key = 'inspiration';
UPDATE public.operation_pricing SET model_name = 'Auphonic API' WHERE operation_key = 'enhance_audio';
UPDATE public.operation_pricing SET model_name = 'ElevenLabs IVC (Instant Voice Cloning)' WHERE operation_key = 'clone_voice';
UPDATE public.operation_pricing SET model_name = 'ElevenLabs Speech-to-Speech' WHERE operation_key = 'voice_translation_per_min';
UPDATE public.operation_pricing SET model_name = 'fal-ai/nano-banana-pro' WHERE operation_key = 'generate_cover';
UPDATE public.operation_pricing SET model_name = 'fal-ai/kling-video v2.5-turbo (+ Runway gen4_turbo)' WHERE operation_key = 'generate_video';
UPDATE public.operation_pricing SET model_name = 'fal-ai/flux-pro v1.1 + claude-haiku-4-5' WHERE operation_key = 'promote_work';
UPDATE public.operation_pricing SET model_name = 'fal-ai/flux-pro v1.1 + claude-haiku-4-5 (revisión humana)' WHERE operation_key = 'promote_premium';
UPDATE public.operation_pricing SET model_name = 'fal-ai/flux-pro v1.1 + claude-haiku-4-5' WHERE operation_key = 'instagram_creative';
UPDATE public.operation_pricing SET model_name = 'fal-ai/flux-pro v1.1 (+ flux/dev img2img)' WHERE operation_key = 'youtube_thumbnail';
UPDATE public.operation_pricing SET model_name = 'fal-ai/flux-pro v1.1 (+ flux/dev img2img)' WHERE operation_key = 'event_poster';
UPDATE public.operation_pricing SET model_name = 'fal-ai/flux-pro v1.1 (+ flux/dev img2img)' WHERE operation_key = 'social_poster';
UPDATE public.operation_pricing SET model_name = 'fal-ai/kling-video v2.5-turbo' WHERE operation_key = 'social_video';

-- Ajustar coste real de Gemini 2.5 Flash en api_cost_config:
-- maxOutputTokens ahora es 8192 (antes implícito ~1500). Output medio realista ~2000 tokens.
-- Input: ~400-1000 × $0.30/M ≈ $0.0003
-- Output: ~2000 × $2.50/M ≈ $0.005
-- Total ~$0.0053 ≈ €0.005 (subimos de 0.004 a 0.005 para reflejar el nuevo techo de tokens)
UPDATE public.api_cost_config
SET
  api_cost_eur = 0.005000,
  api_cost_notes = 'Gemini 2.5 Flash (principal, maxOutputTokens 8192): input $0.30/M + output $2.50/M tokens. ~600 input + ~2000 output ≈ $0.005. Fallback Claude Haiku 4.5 (maxOutputTokens 8192) ~$0.003. Feature GRATUITA para usuario.',
  updated_at = now()
WHERE feature_key = 'improve_prompt';