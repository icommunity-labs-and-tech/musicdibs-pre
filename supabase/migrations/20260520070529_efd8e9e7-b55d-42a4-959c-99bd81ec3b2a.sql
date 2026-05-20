
-- Fix: debit_user_credits ahora también decrementa permanent_credits
-- Lógica: se gasta primero la porción mensual (available - permanent), luego permanent
CREATE OR REPLACE FUNCTION public.debit_user_credits(p_user_id uuid, p_amount integer, p_description text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _available integer;
  _perm integer;
  _monthly_portion integer;
  _perm_used integer;
  _remaining integer;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  SELECT available_credits, COALESCE(permanent_credits, 0)
    INTO _available, _perm
  FROM public.profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF _available IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  IF _available < p_amount THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;

  -- Porción mensual = available - permanent. Se gasta primero.
  _monthly_portion := GREATEST(0, _available - _perm);
  _perm_used := GREATEST(0, p_amount - _monthly_portion);

  UPDATE public.profiles
  SET available_credits = _available - p_amount,
      permanent_credits = GREATEST(0, _perm - _perm_used),
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING available_credits INTO _remaining;

  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (p_user_id, -p_amount, 'usage', COALESCE(p_description, 'Consumo de créditos'));

  RETURN _remaining;
END;
$function$;

-- También sincronizamos decrement_credits con la misma lógica (mensual primero)
CREATE OR REPLACE FUNCTION public.decrement_credits(_user_id uuid, _amount integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _available integer;
  _perm integer;
  _monthly_portion integer;
  _perm_used integer;
BEGIN
  IF _user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Forbidden: cannot modify another user''s credits';
  END IF;

  SELECT available_credits, COALESCE(permanent_credits, 0)
    INTO _available, _perm
  FROM public.profiles
  WHERE user_id = _user_id
  FOR UPDATE;

  _monthly_portion := GREATEST(0, COALESCE(_available, 0) - _perm);
  _perm_used := GREATEST(0, _amount - _monthly_portion);

  UPDATE public.profiles
  SET available_credits = GREATEST(0, available_credits - _amount),
      permanent_credits = GREATEST(0, permanent_credits - _perm_used),
      updated_at = now()
  WHERE user_id = _user_id;
END;
$function$;
