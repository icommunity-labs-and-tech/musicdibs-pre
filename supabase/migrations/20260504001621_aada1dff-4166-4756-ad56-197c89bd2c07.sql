
UPDATE operation_pricing SET operation_name='Artistas Virtuales', operation_icon='👤' WHERE operation_key='generate_press_release';
UPDATE operation_pricing SET operation_name='Registrar Obra' WHERE operation_key='register_work';
UPDATE operation_pricing SET category='gratis', display_order=4 WHERE operation_key='distribute_music';
UPDATE operation_pricing SET display_order=5 WHERE operation_key='register_work';
UPDATE operation_pricing SET is_active=false WHERE operation_key IN ('generate_video','event_poster','social_poster');
UPDATE operation_pricing SET category='visual', display_order=16 WHERE operation_key='instagram_creative';
UPDATE operation_pricing SET category='visual', display_order=17 WHERE operation_key='youtube_thumbnail';
UPDATE operation_pricing SET category='visual', display_order=18 WHERE operation_key='social_video';
