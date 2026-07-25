-- Unificacion plan/tier (2026-07-25): subscription_plan es 100% derivable de
-- subscription_tier, pero se ha desincronizado repetidamente (12+ sitios en
-- el codigo escribian uno sin el otro, causando el bug "Monthly" residual
-- para 9241+ cuentas Free). En vez de fusionar en una sola columna (lo cual
-- rompería cualquier escritura existente que no se haya limpiado), se anade
-- una funcion canonica + un trigger que recalcula subscription_plan a partir
-- de subscription_tier en CADA insert/update, ignorando lo que cualquier
-- codigo intente escribir manualmente en plan. Retrocompatible: el codigo
-- viejo puede seguir escribiendo subscription_plan sin que rompa nada, el
-- trigger simplemente lo sobreescribe con el valor correcto derivado de tier.
--
-- Orden de ejecucion verificado: los 3 triggers BEFORE en profiles se
-- ejecutan en orden alfabetico de nombre --
-- profiles_enforce_immutable_columns -> trg_reset_library_on_reactivation ->
-- trg_sync_plan_from_tier -- este ultimo tiene siempre la ultima palabra
-- sobre subscription_plan.

create or replace function tier_to_plan(p_tier text)
returns text
language plpgsql
immutable
as $$
begin
  if p_tier is null or p_tier = 'free' then
    return 'Free';
  elsif p_tier = 'monthly' then
    return 'Monthly';
  elsif p_tier like 'annual_%' then
    return 'Annual';
  else
    -- Valor de tier no reconocido (ej. 'individual', 'topup_10', o uno nuevo
    -- que se anada en el futuro y no se haya registrado aqui todavia).
    -- Fallback seguro a Free en vez de romper la escritura.
    return 'Free';
  end if;
end;
$$;

create or replace function sync_subscription_plan_from_tier()
returns trigger
language plpgsql
as $$
begin
  new.subscription_plan := tier_to_plan(new.subscription_tier);
  return new;
end;
$$;

create trigger trg_sync_plan_from_tier
before insert or update on profiles
for each row
execute function sync_subscription_plan_from_tier();
