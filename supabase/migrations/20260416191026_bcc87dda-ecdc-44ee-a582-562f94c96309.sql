UPDATE public.operation_pricing
SET credits_cost = 1,
    description = 'Reescribe tu descripción al estilo Suno (género, BPM, instrumentos, estructura, voz, referencias). Usa Gemini 3 Flash.',
    updated_at = now()
WHERE operation_key = 'improve_prompt';