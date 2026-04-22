-- Rename "inspiration" to "one_click_create" with new display name
UPDATE public.operation_pricing
SET 
  operation_key = 'one_click_create',
  operation_name = 'Crear en 1 click',
  operation_label = 'Crear en 1 click',
  description = 'Genera una canción automáticamente con un solo clic'
WHERE operation_key = 'inspiration';

UPDATE public.feature_costs
SET feature_key = 'one_click_create', label = 'Crear en 1 click'
WHERE feature_key = 'inspiration';