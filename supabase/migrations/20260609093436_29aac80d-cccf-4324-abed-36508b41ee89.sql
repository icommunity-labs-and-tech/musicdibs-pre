CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _display_name TEXT;
  _supabase_url TEXT;
  _service_key  TEXT;
  _welcome_credits INT := 1;
  _inserted BOOLEAN := false;
BEGIN
  _display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.email
  );

  INSERT INTO public.profiles (user_id, display_name, available_credits)
  VALUES (NEW.id, _display_name, _welcome_credits)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING true INTO _inserted;

  -- Log welcome bonus only when the profile row was actually created here
  IF _inserted THEN
    BEGIN
      INSERT INTO public.credit_transactions (user_id, amount, type, description)
      VALUES (NEW.id, _welcome_credits, 'bonus', 'Welcome bonus: 1 free credit');
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG '[handle_new_user] welcome credit log failed for %: %', NEW.id, SQLERRM;
    END;
  END IF;

  BEGIN
    SELECT decrypted_secret INTO _service_key
    FROM vault.decrypted_secrets
    WHERE name = 'email_queue_service_role_key'
    LIMIT 1;

    _supabase_url := 'https://kmwehyixenybegwhqljx.supabase.co';

    IF _service_key IS NOT NULL THEN
      PERFORM net.http_post(
        url     := _supabase_url || '/functions/v1/send-welcome-email',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || _service_key
        ),
        body    := jsonb_build_object(
          'userId',      NEW.id::text,
          'email',       NEW.email,
          'displayName', _display_name
        )
      );
    ELSE
      RAISE LOG '[handle_new_user] vault secret not found — welcome email skipped for %', NEW.id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[handle_new_user] welcome email failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;