-- Envío automático de notificación KYC al registrarse.
--
-- Extiende handle_new_user() (trigger on_auth_user_created en auth.users)
-- para, justo después de crear el perfil y enviar el email de bienvenida,
-- disparar también la primera notificación de "completa tu verificación KYC"
-- reutilizando el modo manual ya existente de la función kyc-reminder
-- (respeta: si ya está verificado no envía nada, y queda registrado en
-- kyc_reminder_log/email_send_log igual que cualquier otro recordatorio).
--
-- El bloque va en su propio BEGIN/EXCEPTION para que un fallo aquí nunca
-- impida la creación del usuario (mismo patrón defensivo que ya usaba el
-- envío del email de bienvenida).

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
  _welcome_credits INT := 3;  -- Ampliado de 1 a 3
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
      VALUES (NEW.id, _welcome_credits, 'bonus', 'Welcome bonus: 3 free credits');
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

  -- NUEVO: notificación automática de KYC al registrarse.
  BEGIN
    IF _service_key IS NOT NULL THEN
      PERFORM net.http_post(
        url     := _supabase_url || '/functions/v1/kyc-reminder',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || _service_key
        ),
        body    := jsonb_build_object(
          'user_id',  NEW.id::text,
          'email',    NEW.email,
          'name',     _display_name
        )
      );
    ELSE
      RAISE LOG '[handle_new_user] vault secret not found — kyc notification skipped for %', NEW.id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[handle_new_user] kyc notification failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;
