-- Security scan (2026-07-21): el fix anterior (GRANT/REVOKE por columna,
-- migracion 20260719b) dejaba intactas las politicas RLS "Public read
-- operation_pricing" y "Authenticated read operation_pricing" (using_expr =
-- true, sin restriccion de fila). El escaner detecta correctamente esa
-- politica como el riesgo real: si alguna vez se vuelve a otorgar SELECT de
-- tabla completa a anon/authenticated, la proteccion por columnas deja de
-- ser suficiente por si sola.
--
-- Fix definitivo: se elimina el acceso de fila para anon/authenticated a la
-- tabla operation_pricing por completo (solo quedan las politicas de
-- service_role y de escritura para admins). Los datos publicos se sirven
-- exclusivamente a traves de la vista feature_costs, ampliada con el resto
-- de columnas PUBLICAS necesarias (operation_name, operation_icon,
-- euro_cost, is_annual_only, display_order) y convertida a
-- security_invoker=off para poder leer operation_pricing con las
-- credenciales del propietario de la vista -- seguro precisamente PORQUE la
-- vista limita expresamente las columnas expuestas en su propio SELECT
-- (nunca api_cost_eur, margin_multiplier, llm_provider, llm_model,
-- api_cost_notes), no reenvia la tabla completa.
--
-- PricingPopup.tsx y get-operation-pricing.ts (tool MCP) se redirigen de
-- 'operation_pricing' a 'feature_costs'.

drop view if exists feature_costs;

create view feature_costs as
select
  operation_key as feature_key,
  operation_key,
  coalesce(operation_label, operation_name) as label,
  operation_name,
  operation_icon,
  credits_cost as credit_cost,
  credits_cost,
  euro_cost,
  category,
  description,
  is_active,
  is_annual_only,
  display_order
from operation_pricing
where is_active = true;

alter view feature_costs set (security_invoker = off);

grant select on feature_costs to anon, authenticated;

drop policy if exists "Public read operation_pricing" on operation_pricing;
drop policy if exists "Authenticated read operation_pricing" on operation_pricing;
