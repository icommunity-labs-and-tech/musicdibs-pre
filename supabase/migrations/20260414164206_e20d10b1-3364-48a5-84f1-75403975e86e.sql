
-- Gratis (coste 0, texto/IA ligera)
UPDATE operation_pricing SET category = 'gratis', display_order = 1 WHERE operation_key = 'generate_lyrics';
UPDATE operation_pricing SET category = 'gratis', display_order = 2 WHERE operation_key = 'generate_press_release';
UPDATE operation_pricing SET category = 'gratis', display_order = 3 WHERE operation_key = 'improve_prompt';

-- Registro blockchain
UPDATE operation_pricing SET category = 'registro', display_order = 4 WHERE operation_key = 'register_work';

-- Distribución
UPDATE operation_pricing SET category = 'distribucion', display_order = 5 WHERE operation_key = 'distribute_music';

-- Creación musical
UPDATE operation_pricing SET category = 'musica', display_order = 6 WHERE operation_key = 'generate_audio';
UPDATE operation_pricing SET category = 'musica', display_order = 7 WHERE operation_key = 'generate_audio_song';
UPDATE operation_pricing SET category = 'musica', display_order = 8 WHERE operation_key = 'edit_audio';
UPDATE operation_pricing SET category = 'musica', display_order = 9 WHERE operation_key = 'generate_vocal_track';
UPDATE operation_pricing SET category = 'musica', display_order = 10 WHERE operation_key = 'inspiration';

-- Audio (herramientas de voz/sonido)
UPDATE operation_pricing SET category = 'audio', display_order = 11 WHERE operation_key = 'enhance_audio';
UPDATE operation_pricing SET category = 'audio', display_order = 12 WHERE operation_key = 'clone_voice';
UPDATE operation_pricing SET category = 'audio', display_order = 13 WHERE operation_key = 'voice_translation_per_min';

-- Visual (imagen/vídeo generativo)
UPDATE operation_pricing SET category = 'visual', display_order = 14 WHERE operation_key = 'generate_cover';
UPDATE operation_pricing SET category = 'visual', display_order = 15 WHERE operation_key = 'generate_video';

-- Promoción
UPDATE operation_pricing SET category = 'promo', display_order = 16 WHERE operation_key = 'promote_work';
UPDATE operation_pricing SET category = 'promo', display_order = 17 WHERE operation_key = 'promote_premium';
UPDATE operation_pricing SET category = 'promo', display_order = 18 WHERE operation_key = 'instagram_creative';
UPDATE operation_pricing SET category = 'promo', display_order = 19 WHERE operation_key = 'youtube_thumbnail';
UPDATE operation_pricing SET category = 'promo', display_order = 20 WHERE operation_key = 'event_poster';
UPDATE operation_pricing SET category = 'promo', display_order = 21 WHERE operation_key = 'social_poster';
UPDATE operation_pricing SET category = 'promo', display_order = 22 WHERE operation_key = 'social_video';
