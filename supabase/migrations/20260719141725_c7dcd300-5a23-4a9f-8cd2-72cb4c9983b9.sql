UPDATE public.blog_posts 
SET content = REPLACE(content, 'orientado a artistas profesionales que buscan flujo end-to-end', 'orientado a artistas que buscan flujo end-to-end')
WHERE slug = 'mejor-alternativa-a-suno-ia';

UPDATE public.blog_posts 
SET content = REPLACE(content, 'orientado a artistas profesionales que buscan un flujo end-to-end', 'orientado a artistas que buscan un flujo end-to-end')
WHERE slug = 'melhor-alternativa-ao-suno-ia';

UPDATE public.blog_posts 
SET content = REPLACE(content, 'designed for professional artists who want an end-to-end pipeline', 'designed for artists who want an end-to-end pipeline')
WHERE slug = 'best-suno-ai-alternative';