
-- operation_pricing: add missing columns the frontend expects
ALTER TABLE public.operation_pricing
  ADD COLUMN IF NOT EXISTS operation_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS operation_icon text,
  ADD COLUMN IF NOT EXISTS euro_cost numeric,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'registro',
  ADD COLUMN IF NOT EXISTS is_annual_only boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

-- Backfill operation_name from operation_label for existing rows
UPDATE public.operation_pricing SET operation_name = operation_label WHERE operation_name = '';

-- profiles: add language preference column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'es';
