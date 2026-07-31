-- =========================================================================
-- Fase 8 — Corrección: return_sale_items validaba la cantidad a devolver
-- contra la cantidad ORIGINAL vendida, no contra lo que quedaba disponible
-- tras devoluciones parciales previas. Eso permitía devolver de más across
-- varias transacciones parciales (ej. vender 3, devolver 1, devolver 1,
-- devolver 1 de nuevo = 3 devueltas está bien, pero una 4ª de cualquier
-- monto se aceptaba indebidamente porque 1 > 3 seguía siendo falso).
-- =========================================================================

create or replace function return_sale_items(
  p_sale_id uuid,
  p_items jsonb,
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
  v_already_returned numeric;
  v_remaining numeric;
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

    select coalesce(sum(ri.quantity), 0) into v_already_returned
    from return_items ri
    where ri.sale_item_id = v_sale_item.id and ri.store_id = v_store_id;

    v_remaining := v_sale_item.quantity - v_already_returned;
    v_return_qty := (v_item ->> 'quantity')::numeric;
    if v_return_qty <= 0 or v_return_qty > v_remaining then
      raise exception 'Cantidad de devolución inválida: solo quedan % disponibles para devolver', v_remaining;
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
