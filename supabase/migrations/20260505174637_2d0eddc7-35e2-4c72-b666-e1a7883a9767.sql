
CREATE OR REPLACE FUNCTION public.admin_get_user_credit_audit(p_user_id uuid, p_limit int DEFAULT 100)
RETURNS TABLE(
  user_id uuid,
  email text,
  display_name text,
  stripe_customer_id text,
  record_type text,
  record_id uuid,
  created_at timestamptz,
  event_type text,
  credits_delta integer,
  description text,
  feature_key text,
  stripe_session_id text,
  coupon_code text,
  reference_id text,
  outcome text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;

  RETURN QUERY
  SELECT * FROM (
    SELECT ct.user_id, u.email::text, p.display_name, p.stripe_customer_id,
           'transaction'::text, ct.id, ct.created_at, ct.type::text,
           ct.amount, ct.description, ct.feature_key, ct.stripe_session_id,
           ct.coupon_code, ct.order_id::text, NULL::text
    FROM credit_transactions ct
    JOIN auth.users u ON u.id = ct.user_id
    JOIN profiles p ON p.user_id = ct.user_id
    WHERE ct.user_id = p_user_id
    UNION ALL
    SELECT cvl.user_id, u.email::text, p.display_name, p.stripe_customer_id,
           'validation'::text, cvl.id, cvl.created_at,
           ('validation_' || cvl.outcome)::text,
           -cvl.credits_cost,
           ('Balance antes: ' || cvl.credits_before || ' cr | Feature: ' || cvl.feature_key)::text,
           cvl.feature_key, NULL::text, NULL::text, NULL::text, cvl.outcome
    FROM credit_validation_log cvl
    JOIN auth.users u ON u.id = cvl.user_id
    JOIN profiles p ON p.user_id = cvl.user_id
    WHERE cvl.user_id = p_user_id
  ) t
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_user_credit_audit(uuid, int) TO authenticated;
