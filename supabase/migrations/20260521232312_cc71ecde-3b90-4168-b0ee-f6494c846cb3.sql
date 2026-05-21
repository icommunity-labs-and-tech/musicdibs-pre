UPDATE storage.buckets
SET allowed_mime_types = ARRAY['audio/mpeg','audio/wav','audio/ogg','audio/mp4','audio/midi','audio/x-midi','application/octet-stream']
WHERE id = 'ai-generations';