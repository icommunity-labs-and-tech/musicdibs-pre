INSERT INTO public.feature_costs (feature_key, credit_cost, label) VALUES
  ('generate_audio', 3, 'Generar audio (instrumental)'),
  ('generate_audio_song', 3, 'Generar audio (canción con voz)')
ON CONFLICT (feature_key) DO UPDATE SET credit_cost = EXCLUDED.credit_cost, label = EXCLUDED.label;