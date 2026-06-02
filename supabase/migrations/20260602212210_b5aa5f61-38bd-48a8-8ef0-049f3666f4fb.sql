
-- 1) Add dispute_fee column to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS dispute_fee NUMERIC NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.orders.dispute_fee IS
  'Net cost of Stripe disputes/chargebacks attributed to this order (EUR). Positive when the dispute fee was charged; reduced when fee is refunded on a won dispute.';

-- 2) Create stripe_adjustments table for non-dispute balance adjustments
CREATE TABLE IF NOT EXISTS public.stripe_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  balance_transaction_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  reporting_category TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  fee NUMERIC NOT NULL DEFAULT 0,
  net NUMERIC NOT NULL DEFAULT 0,
  currency TEXT,
  description TEXT,
  source_id TEXT,
  source_type TEXT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_adjustments_occurred_at
  ON public.stripe_adjustments (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_adjustments_type
  ON public.stripe_adjustments (type);
CREATE INDEX IF NOT EXISTS idx_stripe_adjustments_order_id
  ON public.stripe_adjustments (order_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stripe_adjustments TO authenticated;
GRANT ALL ON public.stripe_adjustments TO service_role;

ALTER TABLE public.stripe_adjustments ENABLE ROW LEVEL SECURITY;

-- Admin-only visibility (Edge Functions use service_role and bypass RLS)
CREATE POLICY "Admins can view stripe_adjustments"
  ON public.stripe_adjustments FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
