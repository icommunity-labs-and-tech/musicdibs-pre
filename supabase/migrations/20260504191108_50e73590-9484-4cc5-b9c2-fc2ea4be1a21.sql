UPDATE public.operation_pricing
SET operation_label = 'Crear artista virtual',
    description = 'Generación de perfil de artista virtual',
    operation_icon = '👤'
WHERE operation_key = 'generate_press_release';