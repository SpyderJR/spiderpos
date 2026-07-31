-- =========================================================================
-- Fase 8 — Devoluciones y cancelaciones (PRD 5.H)
-- =========================================================================

-- Devolución total o parcial: regresa stock, registra nota de crédito y
-- ajusta el saldo a crédito del cliente si la venta original incluía fiado.
create or replace function return_sale_items(
  p_sale_id uuid,
  p_items jsonb, -- [{ sale_item_id, quantity }]
  p_reason text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_store_id uuid := auth_store_id();
  v_employee_id uuid;
  v_sale sales%rowtype;
  v_item jsonb;
  v_return_id uuid;
  v_total_returned numeric := 0;
  v_sale_item record;
  v_return_qty numeric;
  v_line_amount numeric;
  v_sale_total numeric;
  v_credit_paid numeric;
  v_credit_refund numeric;
begin
  if v_store_id is null then
    raise exception 'No autenticado en ninguna tienda';
  end if;
  if not (auth_role() in ('owner', 'manager') or auth_has_permission('process_returns')) then
    raise exception 'No autorizado para procesar devoluciones';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'El motivo de la devolución es obligatorio';
  end if;

  select id into v_employee_id from store_members where user_id = auth.uid() and store_id = v_store_id;

  select * into v_sale from sales where id = p_sale_id and store_id = v_store_id for update;
  if v_sale.id is null then
    raise exception 'La venta no pertenece a esta tienda';
  end if;
  if v_sale.status = 'cancelled' then
    raise exception 'No se puede devolver una venta cancelada';
  end if;

  insert into returns (store_id, sale_id, reason, total_returned, created_by)
  values (v_store_id, p_sale_id, p_reason, 0, v_employee_id)
  returning id into v_return_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_sale_item from sale_items
    where id = (v_item ->> 'sale_item_id')::uuid and sale_id = p_sale_id and store_id = v_store_id;
    if v_sale_item.id is null then
      raise exception 'El artículo de venta no pertenece a esta venta';
    end if;

    v_return_qty := (v_item ->> 'quantity')::numeric;
    if v_return_qty <= 0 or v_return_qty > v_sale_item.quantity then
      raise exception 'Cantidad de devolución inválida para %', v_sale_item.id;
    end if;

    v_line_amount := round(v_sale_item.unit_price * v_return_qty - (v_sale_item.discount * v_return_qty / nullif(v_sale_item.quantity, 0)), 2);
    v_total_returned := v_total_returned + v_line_amount;

    insert into return_items (store_id, return_id, sale_item_id, quantity)
    values (v_store_id, v_return_id, v_sale_item.id, v_return_qty);

    update products set stock = stock + v_return_qty, updated_at = now()
    where id = v_sale_item.product_id and store_id = v_store_id;

    insert into stock_movements (store_id, product_id, type, quantity, reference_id, created_by)
    values (v_store_id, v_sale_item.product_id, 'return', v_return_qty, v_return_id, v_employee_id);
  end loop;

  update returns set total_returned = v_total_returned where id = v_return_id;

  -- Si la venta se pagó (total o parcialmente) a crédito, reduce el saldo del
  -- cliente en proporción a lo devuelto.
  if v_sale.customer_id is not null then
    select coalesce(sum(amount), 0) into v_credit_paid from sale_payments where sale_id = p_sale_id and method = 'credit';
    if v_credit_paid > 0 then
      select total into v_sale_total from sales where id = p_sale_id;
      v_credit_refund := least(v_credit_paid, round(v_credit_paid * v_total_returned / nullif(v_sale_total, 0), 2));
      update customers set credit_balance = greatest(0, credit_balance - v_credit_refund), updated_at = now()
      where id = v_sale.customer_id and store_id = v_store_id;
    end if;
  end if;

  update sales
  set status = case
    when (select coalesce(sum(quantity), 0) from return_items ri join returns r on r.id = ri.return_id where r.sale_id = p_sale_id)
         >= (select sum(quantity) from sale_items where sale_id = p_sale_id)
    then 'returned'::sale_status
    else 'partially_returned'::sale_status
  end
  where id = p_sale_id;

  insert into audit_log (store_id, user_id, employee_id, action, entity_type, entity_id, metadata)
  values (v_store_id, auth.uid(), v_employee_id, 'sale.returned', 'sale', p_sale_id, jsonb_build_object('return_id', v_return_id, 'total_returned', v_total_returned, 'reason', p_reason));

  return jsonb_build_object('return_id', v_return_id, 'total_returned', v_total_returned);
end;
$$;

-- Cancelación de venta completa con PIN de supervisor y motivo obligatorio.
create or replace function cancel_sale(p_sale_id uuid, p_reason text, p_supervisor_pin text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_store_id uuid := auth_store_id();
  v_employee_id uuid;
  v_sale sales%rowtype;
  v_item record;
  v_credit_paid numeric;
begin
  if v_store_id is null then
    raise exception 'No autenticado en ninguna tienda';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'El motivo de la cancelación es obligatorio';
  end if;
  if not verify_supervisor_pin(p_supervisor_pin) then
    raise exception 'PIN de supervisor incorrecto';
  end if;

  select id into v_employee_id from store_members where user_id = auth.uid() and store_id = v_store_id;

  select * into v_sale from sales where id = p_sale_id and store_id = v_store_id for update;
  if v_sale.id is null then
    raise exception 'La venta no pertenece a esta tienda';
  end if;
  if v_sale.status in ('cancelled', 'returned') then
    raise exception 'Esta venta ya fue cancelada o devuelta';
  end if;

  for v_item in select * from sale_items where sale_id = p_sale_id and store_id = v_store_id loop
    update products set stock = stock + v_item.quantity, updated_at = now()
    where id = v_item.product_id and store_id = v_store_id;

    insert into stock_movements (store_id, product_id, type, quantity, reference_id, created_by)
    values (v_store_id, v_item.product_id, 'return', v_item.quantity, p_sale_id, v_employee_id);
  end loop;

  if v_sale.customer_id is not null then
    select coalesce(sum(amount), 0) into v_credit_paid from sale_payments where sale_id = p_sale_id and method = 'credit';
    if v_credit_paid > 0 then
      update customers set credit_balance = greatest(0, credit_balance - v_credit_paid), updated_at = now()
      where id = v_sale.customer_id and store_id = v_store_id;
    end if;
  end if;

  update sales set status = 'cancelled', cancelled_reason = p_reason, cancelled_by = v_employee_id where id = p_sale_id;

  insert into audit_log (store_id, user_id, employee_id, action, entity_type, entity_id, metadata)
  values (v_store_id, auth.uid(), v_employee_id, 'sale.cancelled', 'sale', p_sale_id, jsonb_build_object('reason', p_reason));
end;
$$;
