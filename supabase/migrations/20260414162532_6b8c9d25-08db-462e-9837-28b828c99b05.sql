
INSERT INTO operation_pricing (operation_key, operation_label, operation_name, operation_icon, credits_cost, category, is_annual_only, is_active, display_order, description)
VALUES
  ('distribute_music', 'Distribución musical', 'Distribución musical', '🌍', 0, 'distribucion', true, true, 13, 'Distribuir música a plataformas digitales (solo plan anual)'),
  ('promote_premium', 'Promoción premium', 'Promoción premium RRSS', '⭐', 25, 'promo', false, true, 14, 'Solicitud de promoción premium gestionada por el equipo'),
  ('inspiration', 'Inspiración IA', 'Inspiración IA', '💡', 2, 'musica', false, true, 15, 'Generar ideas e inspiración con IA'),
  ('voice_translation_per_min', 'Traducción de voz', 'Traducción de voz por minuto', '🗣️', 2, 'audio', false, true, 16, 'Traducir voz a otro idioma (por minuto)'),
  ('instagram_creative', 'Creativo Instagram', 'Creativo para Instagram', '📸', 1, 'promo', false, true, 17, 'Generar imagen creativa para Instagram'),
  ('youtube_thumbnail', 'Miniatura YouTube', 'Miniatura para YouTube', '▶️', 1, 'promo', false, true, 18, 'Generar miniatura para YouTube'),
  ('event_poster', 'Póster de evento', 'Póster de evento', '🎪', 1, 'promo', false, true, 19, 'Generar póster para evento musical'),
  ('social_poster', 'Póster social', 'Póster para redes sociales', '🖼️', 1, 'promo', false, true, 20, 'Generar póster para redes sociales'),
  ('social_video', 'Vídeo social', 'Vídeo para redes sociales', '📱', 3, 'promo', false, true, 21, 'Generar vídeo corto para redes sociales'),
  ('clone_voice', 'Clonar voz', 'Clonar voz', '🎙️', 0, 'audio', false, true, 22, 'Clonar voz para usar en generaciones')
ON CONFLICT (operation_key) DO NOTHING;
