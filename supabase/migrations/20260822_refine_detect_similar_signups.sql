-- FIX 2026-08-22: el chequeo original reportaba el mismo grupo de cuentas
-- cada dia durante toda la ventana de 7 dias, incluso despues de que el
-- equipo ya hubiera bloqueado las cuentas abusivas (caso real:
-- cancionerocolX@..., bloqueadas el 21 de agosto, seguia apareciendo el
-- 22). Se añade un filtro: solo reportar el grupo si quedan 2 o mas
-- cuentas SIN bloquear (permite que la cuenta "buena" que se decide dejar
-- activa no cuente como pendiente, evitando ruido en dias sucesivos una
-- vez que el equipo ya actuo sobre el caso).
drop function if exists detect_similar_email_signups(integer, integer);

create or replace function detect_similar_email_signups(p_days integer default 7, p_min_group_size integer default 3)
returns table(
  normalized_prefix text,
  account_count bigint,
  unblocked_count bigint,
  emails text[],
  first_created timestamptz,
  last_created timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select
    grp.normalized_prefix,
    grp.account_count,
    count(*) filter (where coalesce(p.is_blocked, false) = false) as unblocked_count,
    array_agg(u.email order by u.created_at) as emails,
    min(u.created_at) as first_created,
    max(u.created_at) as last_created
  from (
    select
      regexp_replace(split_part(email, '@', 1), '[0-9]+$', '') as normalized_prefix,
      count(*) as account_count
    from auth.users
    where created_at > now() - (p_days || ' days')::interval
      and length(regexp_replace(split_part(email, '@', 1), '[0-9]+$', '')) >= 4
    group by regexp_replace(split_part(email, '@', 1), '[0-9]+$', '')
    having count(*) >= p_min_group_size
  ) grp
  join auth.users u
    on regexp_replace(split_part(u.email, '@', 1), '[0-9]+$', '') = grp.normalized_prefix
    and u.created_at > now() - (p_days || ' days')::interval
  left join public.profiles p on p.user_id = u.id
  group by grp.normalized_prefix, grp.account_count
  having count(*) filter (where coalesce(p.is_blocked, false) = false) >= 2
  order by grp.account_count desc;
$$;

revoke all on function detect_similar_email_signups(integer, integer) from public, anon, authenticated;
grant execute on function detect_similar_email_signups(integer, integer) to service_role;
