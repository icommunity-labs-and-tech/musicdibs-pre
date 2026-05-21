INSERT INTO public.operation_pricing
  (operation_key, operation_name, operation_label, operation_icon, description, category, credits_cost, is_active, is_free, is_annual_only, llm_provider, model_name)
VALUES
  ('generate_video', 'Generación de video', 'Generar video con IA', '🎬', 'Generar video musical con IA', 'video', 3, true, false, false, 'fal.ai / Runway', 'Kling v2.5 Turbo Pro'),
  ('event_poster', 'Cartel de evento', 'Cartel de evento', '🪧', 'Generar cartel/flyer para evento musical', 'visual', 1, true, false, false, 'fal.ai', 'fal-ai/flux-pro v1.1'),
  ('social_poster', 'Cartel para redes', 'Cartel para redes sociales', '📣', 'Generar cartel para redes sociales', 'visual', 1, true, false, false, 'fal.ai', 'fal-ai/flux-pro v1.1')
ON CONFLICT (operation_key) DO NOTHING;