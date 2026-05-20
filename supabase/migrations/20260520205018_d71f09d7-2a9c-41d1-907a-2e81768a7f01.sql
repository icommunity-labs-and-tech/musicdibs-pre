INSERT INTO public.operation_pricing (operation_key, operation_label, operation_name, operation_icon, credits_cost, category, is_annual_only, display_order, is_active, description, model_name)
VALUES
  ('enhance_cover', 'Nueva versión desde demo', 'Nueva versión desde demo', '🔁', 1, 'audio', false, 21, true, 'Úsalo para rehacer una demo, reinterpretar una idea, cambiar de estilo musical o producir encima de una melodía existente.', 'Kie AI'),
  ('enhance_extend', 'Extender canción', 'Extender canción', '⏩', 1, 'audio', false, 22, true, 'Úsalo para continuar una demo, ampliar una intro o transformar una idea corta en una canción completa.', 'Kie AI'),
  ('enhance_instrumental', 'Añadir instrumentación', 'Añadir instrumentación', '🎹', 1, 'audio', false, 23, true, 'Úsalo para transformar una melodía simple en una producción completa, añadiendo instrumentos y arreglos.', 'Kie AI')
ON CONFLICT (operation_key) DO UPDATE SET
  operation_name = EXCLUDED.operation_name,
  operation_label = EXCLUDED.operation_label,
  operation_icon = EXCLUDED.operation_icon,
  description = EXCLUDED.description,
  model_name = EXCLUDED.model_name,
  category = EXCLUDED.category;