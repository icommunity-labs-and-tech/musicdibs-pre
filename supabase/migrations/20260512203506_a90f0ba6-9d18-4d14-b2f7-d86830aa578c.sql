
INSERT INTO public.purchase_evidences (
  user_id, order_id, email, display_name,
  product_type, product_name, amount, currency,
  payment_provider, payment_intent_id, checkout_session_id,
  payment_status, certification_status,
  evidence_payload_json, created_at
)
SELECT
  o.user_id,
  o.id,
  u.email,
  COALESCE(p.display_name, u.email),
  CASE
    WHEN o.product_code LIKE 'annual%' THEN 'annual'
    WHEN o.product_code = 'monthly' THEN 'monthly'
    WHEN o.product_code = 'individual' THEN 'single'
    WHEN o.product_code LIKE 'topup_%' THEN 'topup'
    ELSE 'unknown'
  END,
  o.product_label,
  o.amount_gross,
  o.currency,
  'stripe',
  o.stripe_payment_intent_id,
  o.stripe_checkout_session_id,
  'succeeded',
  'pending',
  jsonb_build_object(
    'backfilled', true,
    'backfill_reason', 'order_paid_without_evidence',
    'order_id', o.id,
    'paid_at', o.paid_at
  ),
  COALESCE(o.paid_at, o.created_at)
FROM public.orders o
LEFT JOIN public.purchase_evidences pe
  ON (pe.order_id = o.id
      OR (pe.checkout_session_id IS NOT NULL AND pe.checkout_session_id = o.stripe_checkout_session_id)
      OR (pe.payment_intent_id IS NOT NULL AND pe.payment_intent_id = o.stripe_payment_intent_id))
LEFT JOIN auth.users u ON u.id = o.user_id
LEFT JOIN public.profiles p ON p.user_id = o.user_id
WHERE o.order_status = 'paid'
  AND pe.id IS NULL
  AND o.user_id IS NOT NULL;
