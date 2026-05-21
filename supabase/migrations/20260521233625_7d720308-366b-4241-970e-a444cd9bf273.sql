do $$
begin
  if exists (
    select 1
    from public.credit_transactions
    where user_id = '1a3b50d8-704e-4694-b9a4-13f89e133d46'
      and amount = 2
      and type = 'refund'
      and description = 'Reembolso: KIE no pudo generar el MIDI'
      and created_at >= timestamptz '2026-05-21 23:35:00+00'
      and created_at < timestamptz '2026-05-21 23:36:00+00'
  ) and not exists (
    select 1
    from public.credit_transactions
    where user_id = '1a3b50d8-704e-4694-b9a4-13f89e133d46'
      and type = 'adjustment'
      and description = 'Ajuste: reversión de reembolso duplicado MIDI (2f27b71e-bda8-4caa-8f4d-98bce8d6e122)'
  ) then
    update public.profiles
    set available_credits = greatest(available_credits - 2, 0),
        updated_at = now()
    where user_id = '1a3b50d8-704e-4694-b9a4-13f89e133d46';

    insert into public.credit_transactions (user_id, amount, type, description)
    values (
      '1a3b50d8-704e-4694-b9a4-13f89e133d46',
      -2,
      'adjustment',
      'Ajuste: reversión de reembolso duplicado MIDI (2f27b71e-bda8-4caa-8f4d-98bce8d6e122)'
    );
  end if;
end $$;