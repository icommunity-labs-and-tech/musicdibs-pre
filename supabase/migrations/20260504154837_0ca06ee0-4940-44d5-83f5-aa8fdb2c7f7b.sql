
-- 1. Añadir columnas nuevas a operation_pricing
ALTER TABLE public.operation_pricing
  ADD COLUMN IF NOT EXISTS price_per_credit_eur numeric DEFAULT 0.60,
  ADD COLUMN IF NOT EXISTS api_cost_notes text;

-- 2. Migrar datos desde api_cost_config -> operation_pricing (match por key)
UPDATE public.operation_pricing op
SET
  price_per_credit_eur = COALESCE(acc.price_per_credit_eur, op.price_per_credit_eur, 0.60),
  api_cost_eur         = COALESCE(op.api_cost_eur, acc.api_cost_eur),
  api_cost_notes       = COALESCE(op.api_cost_notes, acc.api_cost_notes),
  llm_provider         = COALESCE(op.llm_provider, acc.api_provider),
  llm_model            = COALESCE(op.llm_model, acc.api_model)
FROM public.api_cost_config acc
WHERE acc.feature_key = op.operation_key;

-- 3. Insertar features que existen en api_cost_config pero no en operation_pricing
INSERT INTO public.operation_pricing (
  operation_key, operation_name, operation_label, credits_cost,
  price_per_credit_eur, api_cost_eur, api_cost_notes,
  llm_provider, llm_model, category, is_active
)
SELECT
  acc.feature_key,
  acc.feature_label,
  acc.feature_label,
  acc.credits_charged,
  acc.price_per_credit_eur,
  acc.api_cost_eur,
  acc.api_cost_notes,
  acc.api_provider,
  acc.api_model,
  'registro',
  true
FROM public.api_cost_config acc
WHERE NOT EXISTS (
  SELECT 1 FROM public.operation_pricing op WHERE op.operation_key = acc.feature_key
);

-- 4. Migrar feature_costs -> operation_pricing (solo si difieren)
UPDATE public.operation_pricing op
SET credits_cost = fc.credit_cost
FROM public.feature_costs fc
WHERE fc.feature_key = op.operation_key
  AND op.credits_cost IS DISTINCT FROM fc.credit_cost
  AND fc.credit_cost > 0;

INSERT INTO public.operation_pricing (
  operation_key, operation_name, operation_label, credits_cost, category, is_active
)
SELECT fc.feature_key, fc.label, fc.label, fc.credit_cost, 'registro', true
FROM public.feature_costs fc
WHERE NOT EXISTS (
  SELECT 1 FROM public.operation_pricing op WHERE op.operation_key = fc.feature_key
);

-- 5. Eliminar tablas y reemplazar por vistas
DROP TABLE IF EXISTS public.api_cost_config CASCADE;
DROP TABLE IF EXISTS public.feature_costs CASCADE;

CREATE OR REPLACE VIEW public.api_cost_config AS
SELECT
  operation_key                                        AS feature_key,
  COALESCE(operation_label, operation_name)            AS feature_label,
  llm_provider                                         AS api_provider,
  llm_model                                            AS api_model,
  credits_cost                                         AS credits_charged,
  COALESCE(price_per_credit_eur, 0.60)::numeric        AS price_per_credit_eur,
  COALESCE(api_cost_eur, 0)::numeric                   AS api_cost_eur,
  api_cost_notes                                       AS api_cost_notes,
  'per_use'::text                                      AS api_cost_unit,
  created_at, updated_at, id
FROM public.operation_pricing
WHERE is_active = true;

CREATE OR REPLACE VIEW public.feature_costs AS
SELECT
  operation_key                              AS feature_key,
  COALESCE(operation_label, operation_name)  AS label,
  credits_cost                               AS credit_cost
FROM public.operation_pricing
WHERE is_active = true;

GRANT SELECT ON public.api_cost_config TO anon, authenticated, service_role;
GRANT SELECT ON public.feature_costs   TO anon, authenticated, service_role;

-- 6. Añadir feature_key a credit_transactions
ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS feature_key text;

CREATE INDEX IF NOT EXISTS credit_transactions_feature_key_idx
  ON public.credit_transactions(feature_key);

CREATE INDEX IF NOT EXISTS credit_transactions_created_at_idx
  ON public.credit_transactions(created_at);
