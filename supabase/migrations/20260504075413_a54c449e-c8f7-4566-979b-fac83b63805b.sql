
-- 1. Fix auphonic-temp storage bucket: enforce per-user folder on upload
DROP POLICY IF EXISTS "Auth users upload auphonic-temp" ON storage.objects;
CREATE POLICY "Auth users upload auphonic-temp"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'auphonic-temp'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. Add INSERT policy for profiles (own row only)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 3. Tighten realtime.messages topic policies (replace LIKE '%uid%' with prefix match 'uid:')
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'realtime' AND tablename = 'messages'
  LOOP
    IF (pol.qual ILIKE '%auth.uid%' AND pol.qual ILIKE '%LIKE%') OR
       (pol.with_check ILIKE '%auth.uid%' AND pol.with_check ILIKE '%LIKE%') THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON realtime.messages', pol.policyname);
    END IF;
  END LOOP;
END $$;

CREATE POLICY "Users can read own topic messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (realtime.topic() LIKE (auth.uid()::text || ':%'));

CREATE POLICY "Users can write own topic messages"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (realtime.topic() LIKE (auth.uid()::text || ':%'));

-- 4. Restrict ai_generations policies from 'public' role to 'authenticated'
DROP POLICY IF EXISTS "Users can delete own generations" ON public.ai_generations;
DROP POLICY IF EXISTS "Users can insert own generations" ON public.ai_generations;
DROP POLICY IF EXISTS "Users can read own generations" ON public.ai_generations;
DROP POLICY IF EXISTS "Users can update own generations" ON public.ai_generations;

CREATE POLICY "Users can read own generations"
ON public.ai_generations FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own generations"
ON public.ai_generations FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own generations"
ON public.ai_generations FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own generations"
ON public.ai_generations FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- 5. Revoke EXECUTE on decrement_credits from anon/authenticated (only edge functions / service_role should call it)
REVOKE EXECUTE ON FUNCTION public.decrement_credits(uuid, integer) FROM PUBLIC, anon, authenticated;
