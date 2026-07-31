-- =========================================================================
-- Fase 6 — Abonos de clientes (fiados): RPC atómica que registra el pago
-- y descuenta el saldo, con auditoría (PRD 5.F).
-- =========================================================================

create or replace function record_customer_payment(
  p_customer_id uuid,
  p_amount numeric,
  p_method text default 'cash',
  p_note text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_store_id uuid := auth_store_id();
  v_employee_id uuid;
  v_new_balance numeric;
begin
  if v_store_id is null then
    raise exception 'No autenticado en ninguna tienda';
  end if;
  if p_amount <= 0 then
    raise exception 'El monto del abono debe ser positivo';
  end if;

  select id into v_employee_id from store_members where user_id = auth.uid() and store_id = v_store_id;

  update customers
  set credit_balance = greatest(0, credit_balance - p_amount), updated_at = now()
  where id = p_customer_id and store_id = v_store_id
  returning credit_balance into v_new_balance;

  if v_new_balance is null then
    raise exception 'El cliente no pertenece a esta tienda';
  end if;

  insert into customer_payments (store_id, customer_id, amount, method, note, created_by)
  values (v_store_id, p_customer_id, p_amount, p_method, p_note, v_employee_id);

  insert into audit_log (store_id, user_id, employee_id, action, entity_type, entity_id, metadata)
  values (
    v_store_id, auth.uid(), v_employee_id, 'customer.payment_recorded', 'customer', p_customer_id,
    jsonb_build_object('amount', p_amount, 'new_balance', v_new_balance)
  );

  return jsonb_build_object('new_balance', v_new_balance);
end;
$$;
