-- Fix 1: Remove public read policy on auphonic-temp bucket and replace with user-scoped policy
DROP POLICY IF EXISTS "Public read auphonic-temp" ON storage.objects;

CREATE POLICY "Users can read own auphonic-temp files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'auphonic-temp'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Fix 2: Add RLS policy on realtime.messages so users can only subscribe to their own channels
-- Topic convention: any topic containing the subscriber's user_id is allowed; service role bypasses RLS.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can subscribe to own topics" ON realtime.messages;
CREATE POLICY "Authenticated users can subscribe to own topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE '%' || auth.uid()::text || '%'
);

DROP POLICY IF EXISTS "Authenticated users can broadcast to own topics" ON realtime.messages;
CREATE POLICY "Authenticated users can broadcast to own topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() LIKE '%' || auth.uid()::text || '%'
);