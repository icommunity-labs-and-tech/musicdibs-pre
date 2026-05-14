ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_price_id TEXT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_price_id ON public.subscriptions(stripe_price_id);