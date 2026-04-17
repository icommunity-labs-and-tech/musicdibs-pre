UPDATE public.api_cost_config
SET
  api_provider = 'google_gemini',
  api_cost_eur = 0.004000,
  api_cost_notes = 'Gemini 2.5 Flash (principal): input $0.30/M + output $2.50/M tokens. ~400 input + ~1500 output ≈ $0.004. Fallback Claude Haiku ~$0.0005. Feature GRATUITA para usuario.',
  updated_at = now()
WHERE feature_key = 'improve_prompt';