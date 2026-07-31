-- =========================================================================
-- Fase 5 — Recepción de orden de compra: actualiza stock y costo promedio
-- ponderado de cada producto en una sola transacción (PRD 5.E).
-- =========================================================================

create or replace function receive_purchase_order(p_purchase_order_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_store_id uuid := auth_store_id();
  v_item record;
  v_new_stock numeric;
  v_new_cost numeric;
  v_total numeric := 0;
  v_row_count int;
begin
  if v_store_id is null then
    raise exception 'No autenticado en ninguna tienda';
  end if;

  if not (auth_role() in ('owner', 'manager') or auth_has_permission('manage_inventory')) then
    raise exception 'No autorizado para recibir mercancía';
  end if;

  update purchase_orders
  set status = 'received', received_at = now()
  where id = p_purchase_order_id and store_id = v_store_id and status <> 'received';

  get diagnostics v_row_count = row_count;
  if v_row_count = 0 then
    return jsonb_build_object('already_received', true);
  end if;

  for v_item in
    select poi.product_id, poi.quantity, poi.unit_cost, p.stock as current_stock, p.cost as current_cost
    from purchase_order_items poi
    join products p on p.id = poi.product_id
    where poi.purchase_order_id = p_purchase_order_id and poi.store_id = v_store_id
  loop
    v_new_stock := v_item.current_stock + v_item.quantity;
    -- Costo promedio ponderado; si no había stock previo, el nuevo costo es el de compra.
    if v_new_stock > 0 then
      v_new_cost := ((v_item.current_stock * v_item.current_cost) + (v_item.quantity * v_item.unit_cost)) / v_new_stock;
    else
      v_new_cost := v_item.unit_cost;
    end if;

    update products
    set stock = v_new_stock, cost = round(v_new_cost, 4), updated_at = now()
    where id = v_item.product_id and store_id = v_store_id;

    insert into stock_movements (store_id, product_id, type, quantity, unit_cost, reference_id, created_by)
    values (
      v_store_id, v_item.product_id, 'purchase', v_item.quantity, v_item.unit_cost, p_purchase_order_id,
      (select id from store_members where user_id = auth.uid() and store_id = v_store_id)
    );

    v_total := v_total + (v_item.quantity * v_item.unit_cost);
  end loop;

  update purchase_orders set total = v_total where id = p_purchase_order_id and store_id = v_store_id;

  insert into audit_log (store_id, user_id, employee_id, action, entity_type, entity_id, metadata)
  values (
    v_store_id, auth.uid(),
    (select id from store_members where user_id = auth.uid() and store_id = v_store_id),
    'purchase_order.received', 'purchase_order', p_purchase_order_id,
    jsonb_build_object('total', v_total)
  );

  return jsonb_build_object('already_received', false, 'total', v_total);
end;
$$;
