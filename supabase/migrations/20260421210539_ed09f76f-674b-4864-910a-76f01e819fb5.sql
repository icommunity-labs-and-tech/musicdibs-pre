-- Índices para acelerar el listado de la biblioteca multimedia
CREATE INDEX IF NOT EXISTS idx_ai_generations_user_created
  ON public.ai_generations (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created
  ON public.credit_transactions (user_id, created_at DESC);