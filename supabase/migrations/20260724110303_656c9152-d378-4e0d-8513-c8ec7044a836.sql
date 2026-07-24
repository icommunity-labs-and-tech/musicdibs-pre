CREATE OR REPLACE FUNCTION public.get_welcome_credit_stats(_start timestamptz, _end timestamptz)
RETURNS TABLE(users_count integer, converted_count integer, net_revenue numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH first_usage AS (
    SELECT user_id, MIN(created_at) AS first_use
    FROM public.credit_transactions
    WHERE type = 'usage'
      AND created_at >= _start
      AND created_at <= _end
    GROUP BY user_id
  ),
  welcome_bonus AS (
    SELECT DISTINCT user_id
    FROM public.credit_transactions
    WHERE type = 'bonus' AND description ILIKE 'Welcome%'
  ),
  prior_usage AS (
    SELECT DISTINCT user_id
    FROM public.credit_transactions
    WHERE type = 'usage' AND created_at < _start
  ),
  eligible AS (
    SELECT fu.user_id, fu.first_use
    FROM first_usage fu
    JOIN welcome_bonus wb USING (user_id)
    WHERE NOT EXISTS (SELECT 1 FROM prior_usage pu WHERE pu.user_id = fu.user_id)
  ),
  buyer_orders AS (
    SELECT o.user_id,
           COALESCE(
             GREATEST(0,
               (CASE WHEN o.amount_net IS NOT NULL AND o.amount_net > 0
                     THEN o.amount_net
                     ELSE COALESCE(o.amount_gross, 0)
                END)
               - COALESCE(o.stripe_fee, 0)
               - COALESCE(o.dispute_fee, 0)
             ), 0) AS net
    FROM public.orders o
    JOIN eligible e ON e.user_id = o.user_id
    WHERE o.order_status = 'paid'
      AND o.paid_at >= _start
      AND o.paid_at <= _end
      AND o.paid_at >= e.first_use
  )
  SELECT
    (SELECT COUNT(*)::int FROM eligible) AS users_count,
    (SELECT COUNT(DISTINCT user_id)::int FROM buyer_orders) AS converted_count,
    COALESCE((SELECT ROUND(SUM(net)::numeric, 2) FROM buyer_orders), 0) AS net_revenue;
$$;

REVOKE ALL ON FUNCTION public.get_welcome_credit_stats(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_welcome_credit_stats(timestamptz, timestamptz) TO service_role;