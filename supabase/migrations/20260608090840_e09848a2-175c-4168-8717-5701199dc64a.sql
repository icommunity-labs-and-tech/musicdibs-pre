DO $$
DECLARE v text;
BEGIN
  SELECT decrypted_secret INTO v FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1;
  RAISE NOTICE 'vault key length: %, starts: %', length(v), LEFT(COALESCE(v,'(null)'), 12);
END $$;