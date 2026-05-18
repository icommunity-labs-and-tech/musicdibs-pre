ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stripe_fee numeric NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.orders.stripe_fee IS 'Comisión de Stripe en la moneda de la orden (EUR), neta de impuestos. Obtenida desde balance_transactions.fee. Default 0 para órdenes sin fee conocido.';
CREATE INDEX IF NOT EXISTS idx_orders_status_paidat ON public.orders(order_status, paid_at);