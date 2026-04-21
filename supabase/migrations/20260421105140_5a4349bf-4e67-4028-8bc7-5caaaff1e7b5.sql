-- Drop existing permissive policies on blog-images bucket
DROP POLICY IF EXISTS "Authenticated users can upload blog images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update blog images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete blog images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone authenticated can upload blog images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone authenticated can update blog images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone authenticated can delete blog images" ON storage.objects;
DROP POLICY IF EXISTS "Blog images insert" ON storage.objects;
DROP POLICY IF EXISTS "Blog images update" ON storage.objects;
DROP POLICY IF EXISTS "Blog images delete" ON storage.objects;

-- Public read remains (bucket is public) — recreate explicit read policy just in case
DROP POLICY IF EXISTS "Public read blog images" ON storage.objects;
CREATE POLICY "Public read blog images"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-images');

-- Admin-only write/update/delete
CREATE POLICY "Admins can upload blog images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'blog-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update blog images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'blog-images' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'blog-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete blog images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'blog-images' AND has_role(auth.uid(), 'admin'::app_role));