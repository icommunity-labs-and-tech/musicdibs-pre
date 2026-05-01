
-- 1) Corregir feature_label de enhance_audio (Auphonic = limpieza/mejora, NO masterización)
UPDATE public.api_cost_config
SET feature_label = 'Mejora y limpieza de audio (Auphonic)',
    api_cost_notes = 'Auphonic API: ~$0.10 por hora de audio. Limpieza, leveling, denoise. NO es masterización.',
    updated_at = now()
WHERE feature_key = 'enhance_audio';

-- 2) Insertar feature master_audio (ROEX) si no existe
INSERT INTO public.api_cost_config (
  feature_key, feature_label, api_provider, api_model,
  api_cost_eur, api_cost_unit, credits_charged, price_per_credit_eur, api_cost_notes
)
VALUES (
  'master_audio',
  'Masterización profesional (ROEX)',
  'roex',
  'roex-tonn-mastering',
  0.250000,
  'per_generation',
  3,
  0.6000,
  'ROEX Tonn API: masterización profesional de canción completa. Preview gratis; coste real solo en master final.'
)
ON CONFLICT (feature_key) DO UPDATE SET
  feature_label = EXCLUDED.feature_label,
  api_provider  = EXCLUDED.api_provider,
  api_model     = EXCLUDED.api_model,
  api_cost_eur  = EXCLUDED.api_cost_eur,
  credits_charged = EXCLUDED.credits_charged,
  api_cost_notes = EXCLUDED.api_cost_notes,
  updated_at = now();

-- 3) Añadir master_audio también a feature_costs si la tabla existe y no tiene la fila
INSERT INTO public.feature_costs (feature_key, credit_cost)
VALUES ('master_audio', 3)
ON CONFLICT (feature_key) DO UPDATE SET credit_cost = EXCLUDED.credit_cost;
