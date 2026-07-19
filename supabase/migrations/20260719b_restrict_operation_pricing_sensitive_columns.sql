-- Security scan (2026-07-19): "Internal cost and margin data exposed publicly".
-- operation_pricing tenia RLS con using_expr=true para SELECT (tanto "Public
-- read" como "Authenticated read"), y el GRANT era a nivel de TABLA completa
-- para anon Y authenticated -- cualquiera (con o sin login) podia leer
-- directamente nuestros costes de API y margenes via PostgREST
-- (GET .../operation_pricing?select=api_cost_eur,margin_multiplier,...).
--
-- Fix: se revoca el SELECT a nivel de tabla para anon/authenticated y se
-- regrantea solo sobre las columnas publicas (operation_key, label,
-- credits_cost, category, descripcion, etc). Las columnas sensibles
-- (api_cost_eur, margin_multiplier, price_per_credit_eur, api_cost_notes,
-- llm_model, llm_provider, llm_recommendation, model_name) dejan de ser
-- legibles directamente. Los paneles admin (AdminApiCostsPage.tsx,
-- AdminFeatureCostsPage.tsx) pasan a leer los datos completos via una
-- funcion RPC SECURITY DEFINER que verifica has_role(auth.uid(), 'admin')
-- internamente.

revoke select on operation_pricing from anon, authenticated;

grant select (
  id, operation_key, operation_label, operation_name, operation_icon,
  credits_cost, euro_cost, category, description, is_active, is_free,
  is_annual_only, display_order, created_at, updated_at
) on operation_pricing to anon, authenticated;

create or replace function get_operation_pricing_admin()
returns setof operation_pricing
language plpgsql
security definer
set search_path = public
as $$
begin
  if not has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'Forbidden';
  end if;
  return query select * from operation_pricing order by category, operation_key;
end;
$$;

grant execute on function get_operation_pricing_admin() to authenticated;
