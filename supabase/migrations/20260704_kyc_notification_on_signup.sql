-- Envío automático de notificación KYC al registrarse.
--
-- Extiende handle_new_user() (trigger on_auth_user_created en auth.users)
-- para, justo después de crear el perfil y enviar el email de bienvenida,
-- disparar también la primera notificación de "completa tu verificación KYC"
-- reutilizando el modo manual ya existente de la función kyc-reminder
-- (respeta: si ya está verificado no envía nada, y queda registrado en
-- kyc_reminder_log/email_send_log igual que cualquier otro recordatorio).
--
-- FIX (2026-07-04): la primera versión de este cambio usaba el secreto del
-- vault 'email_queue_service_role_key' (Authorization: Bearer) igual que
-- send-welcome-email. Esa clave rotó de forma independiente y sin aviso
-- entre las 14:41 y las 15:43 UTC, causando 401 Unauthorized silenciosos
-- en kyc-reminder (que valida el secreto estrictamente, a diferencia de
-- send-welcome-email, que no lo valida y por eso seguía "funcionando" pese
-- al mismo problema). Cambiado a x-cron-secret con CRON_SECRET, el mismo
-- mecanismo estable usado por todos los crons de este proyecto.
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
  _cron_secret  TEXT := 'W4-WCTgtYjeNi1cHFYWvQ37wTaLHYw9oWXE9ifmmJ1E';
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

  IF _inserted THEN
    BEGIN
      INSERT INTO public.credit_transactions (user_id, amount, type, description)
      VALUES (NEW.id, _welcome_credits, 'bonus', 'Welcome bonus: 3 free credits');
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG '[handle_new_user] welcome credit log failed for %: %', NEW.id, SQLERRM;
    END;
  END IF;

  _supabase_url := 'https://kmwehyixenybegwhqljx.supabase.co';

  BEGIN
    SELECT decrypted_secret INTO _service_key
    FROM vault.decrypted_secrets
    WHERE name = 'email_queue_service_role_key'
    LIMIT 1;

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

  -- Notificación automática de KYC al registrarse (usa x-cron-secret, ver nota arriba).
  BEGIN
    PERFORM net.http_post(
      url     := _supabase_url || '/functions/v1/kyc-reminder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', _cron_secret
      ),
      body    := jsonb_build_object(
        'user_id',  NEW.id::text,
        'email',    NEW.email,
        'name',     _display_name
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[handle_new_user] kyc notification failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;
