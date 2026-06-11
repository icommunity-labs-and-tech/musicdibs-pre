
DROP POLICY IF EXISTS public_read_documents ON storage.objects;
DROP POLICY IF EXISTS auth_users_upload_documents ON storage.objects;
DROP POLICY IF EXISTS auth_users_delete_own_documents ON storage.objects;

CREATE POLICY owner_or_admin_read_documents
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR (storage.foldername(name))[2] = (auth.uid())::text
    )
  );

CREATE POLICY owner_insert_documents
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'youtube-requests'
    AND (storage.foldername(name))[2] = (auth.uid())::text
  );

CREATE POLICY owner_or_admin_delete_documents
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR (storage.foldername(name))[2] = (auth.uid())::text
    )
  );
