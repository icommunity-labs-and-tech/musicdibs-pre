-- Diagnostico para el bug intermitente "subscription_plan=Monthly/tier=null
-- tras comprar annual_20/annual_100" (documentado sin reproducir desde
-- 2026-07-15/16, segunda ocurrencia confirmada 2026-07-22 con yaugika@gmail.com).
-- Los logs de Supabase solo retienen ~24h, insuficiente para un bug intermitente
-- y poco frecuente. Esta tabla persiste la resolucion de precio/plan de CADA
-- compra de suscripcion (checkout.session.completed y subscription_create),
-- incluyendo los lineItems crudos de Stripe, para poder investigar la proxima
-- vez que aparezca sin depender de logs ya rotados.
create table stripe_price_resolution_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source_event text not null, -- 'checkout_completed' | 'subscription_create'
  session_or_invoice_id text,
  stripe_customer_id text,
  user_id uuid,
  resolved_price_id text,
  resolved_plan_id text,
  resolved_plan_name text,
  line_items_raw jsonb
);

create index idx_stripe_price_resolution_log_user on stripe_price_resolution_log(user_id);
create index idx_stripe_price_resolution_log_created on stripe_price_resolution_log(created_at);

alter table stripe_price_resolution_log enable row level security;
create policy "Service role full access stripe_price_resolution_log" on stripe_price_resolution_log for all using (true);

revoke all on stripe_price_resolution_log from anon, authenticated;
grant all on stripe_price_resolution_log to service_role;
