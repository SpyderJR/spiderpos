-- =========================================================================
-- Fase 5 — Ajuste manual de stock con motivo obligatorio y auditoría
-- (PRD 5.E: "ajustes manuales con motivo y auditoría").
-- =========================================================================

create or replace function adjust_stock(p_product_id uuid, p_new_stock numeric, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_store_id uuid := auth_store_id();
  v_employee_id uuid;
  v_current_stock numeric;
  v_delta numeric;
begin
  if v_store_id is null then
    raise exception 'No autenticado en ninguna tienda';
  end if;
  if not (auth_role() in ('owner', 'manager') or auth_has_permission('manage_inventory')) then
    raise exception 'No autorizado para ajustar inventario';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'El motivo del ajuste es obligatorio';
  end if;

  select id into v_employee_id from store_members where user_id = auth.uid() and store_id = v_store_id;

  select stock into v_current_stock from products where id = p_product_id and store_id = v_store_id for update;
  if v_current_stock is null then
    raise exception 'El producto no pertenece a esta tienda';
  end if;

  v_delta := p_new_stock - v_current_stock;

  update products set stock = p_new_stock, updated_at = now() where id = p_product_id and store_id = v_store_id;

  insert into stock_movements (store_id, product_id, type, quantity, reason, created_by)
  values (v_store_id, p_product_id, 'adjustment', v_delta, p_reason, v_employee_id);

  insert into audit_log (store_id, user_id, employee_id, action, entity_type, entity_id, metadata)
  values (
    v_store_id, auth.uid(), v_employee_id, 'product.stock_adjusted', 'product', p_product_id,
    jsonb_build_object('delta', v_delta, 'new_stock', p_new_stock, 'reason', p_reason)
  );
end;
$$;
