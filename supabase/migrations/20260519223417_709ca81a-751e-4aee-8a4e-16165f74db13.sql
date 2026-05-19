CREATE TABLE IF NOT EXISTS public.stripe_backfill_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_charge_id TEXT,
  charges_processed INTEGER DEFAULT 0,
  orders_inserted INTEGER DEFAULT 0,
  orders_skipped INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.stripe_backfill_state (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.stripe_backfill_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_backfill_state"
ON public.stripe_backfill_state
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));