-- =========================================================================
-- Fase 7 — Apertura y cierre de turno (corte ciego), PRD 5.G.
--
-- close_cash_shift calcula el teórico (fondo inicial + ventas en efectivo
-- del turno + entradas - salidas) SERVER-SIDE y solo lo devuelve una vez
-- que el cajero ya envió su conteo — así el "corte ciego" es real: el
-- cliente nunca tiene forma de consultar el teórico antes de contar.
-- =========================================================================

create or replace function open_cash_shift(p_opening_amount numeric) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_store_id uuid := auth_store_id();
  v_employee_id uuid;
  v_shift_id uuid;
begin
  if v_store_id is null then
    raise exception 'No autenticado en ninguna tienda';
  end if;

  select id into v_employee_id from store_members where user_id = auth.uid() and store_id = v_store_id;

  if exists (select 1 from cash_shifts where store_id = v_store_id and employee_id = v_employee_id and status = 'open') then
    raise exception 'Ya tienes un turno abierto';
  end if;

  insert into cash_shifts (store_id, employee_id, opening_amount, opening_at, status)
  values (v_store_id, v_employee_id, p_opening_amount, now(), 'open')
  returning id into v_shift_id;

  insert into audit_log (store_id, user_id, employee_id, action, entity_type, entity_id, metadata)
  values (v_store_id, auth.uid(), v_employee_id, 'cash_shift.opened', 'cash_shift', v_shift_id, jsonb_build_object('opening_amount', p_opening_amount));

  return v_shift_id;
end;
$$;

create or replace function close_cash_shift(p_cash_shift_id uuid, p_counted_amount numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_store_id uuid := auth_store_id();
  v_employee_id uuid;
  v_shift cash_shifts%rowtype;
  v_cash_sales numeric;
  v_cash_in numeric;
  v_cash_out numeric;
  v_theoretical numeric;
  v_difference numeric;
begin
  if v_store_id is null then
    raise exception 'No autenticado en ninguna tienda';
  end if;

  select id into v_employee_id from store_members where user_id = auth.uid() and store_id = v_store_id;

  select * into v_shift from cash_shifts where id = p_cash_shift_id and store_id = v_store_id for update;
  if v_shift.id is null then
    raise exception 'El turno no pertenece a esta tienda';
  end if;
  if v_shift.status = 'closed' then
    raise exception 'Este turno ya fue cerrado';
  end if;
  if v_shift.employee_id <> v_employee_id and not (auth_role() in ('owner', 'manager')) then
    raise exception 'Solo el cajero que abrió el turno o un supervisor pueden cerrarlo';
  end if;

  select coalesce(sum(sp.amount), 0) into v_cash_sales
  from sale_payments sp
  join sales s on s.id = sp.sale_id
  where s.cash_shift_id = p_cash_shift_id and sp.method = 'cash';

  select coalesce(sum(amount) filter (where type = 'in'), 0), coalesce(sum(amount) filter (where type = 'out'), 0)
  into v_cash_in, v_cash_out
  from cash_movements where cash_shift_id = p_cash_shift_id;

  v_theoretical := v_shift.opening_amount + v_cash_sales + v_cash_in - v_cash_out;
  v_difference := p_counted_amount - v_theoretical;

  update cash_shifts
  set closing_amount_theoretical = v_theoretical,
      closing_amount_counted = p_counted_amount,
      difference = v_difference,
      closing_at = now(),
      status = 'closed'
  where id = p_cash_shift_id;

  insert into audit_log (store_id, user_id, employee_id, action, entity_type, entity_id, metadata)
  values (
    v_store_id, auth.uid(), v_employee_id, 'cash_shift.closed', 'cash_shift', p_cash_shift_id,
    jsonb_build_object('theoretical', v_theoretical, 'counted', p_counted_amount, 'difference', v_difference)
  );

  return jsonb_build_object('theoretical', v_theoretical, 'counted', p_counted_amount, 'difference', v_difference);
end;
$$;
