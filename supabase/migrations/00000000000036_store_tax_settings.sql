-- =========================================================================
-- IVA configurable por tienda — algunos negocios lo cobran, otros no (o
-- venden productos exentos), y el porcentaje varía según su régimen
-- fiscal. record_sale() sigue siendo la única fuente de verdad del total
-- de una venta (nunca se confía en lo que calcule el cliente): ahora lee
-- tax_enabled/tax_rate de la tienda y calcula el impuesto ahí mismo.
-- =========================================================================

alter table stores add column tax_enabled boolean not null default false;
alter table stores add column tax_rate numeric(5,2) not null default 16.00 check (tax_rate >= 0 and tax_rate <= 100);

create or replace function record_sale(
  p_sale_id uuid,
  p_items jsonb,
  p_payments jsonb,
  p_client_created_at timestamptz,
  p_customer_id uuid default null,
  p_discount numeric default 0,
  p_notes text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_store_id uuid := auth_store_id();
  v_employee_id uuid;
  v_open_shift uuid;
  v_item jsonb;
  v_payment jsonb;
  v_subtotal numeric := 0;
  v_taxable numeric := 0;
  v_tax numeric := 0;
  v_total numeric := 0;
  v_paid numeric := 0;
  v_credit_amount numeric := 0;
  v_row_count int;
  v_customer_credit_limit numeric;
  v_customer_credit_balance numeric;
  v_tax_enabled boolean;
  v_tax_rate numeric;
begin
  if v_store_id is null then
    raise exception 'No autenticado en ninguna tienda';
  end if;

  select id into v_employee_id from store_members where user_id = auth.uid() and store_id = v_store_id;
  if v_employee_id is null then
    raise exception 'Empleado no encontrado';
  end if;

  select tax_enabled, tax_rate into v_tax_enabled, v_tax_rate from stores where id = v_store_id;

  select id into v_open_shift
  from cash_shifts
  where store_id = v_store_id and employee_id = v_employee_id and status = 'open'
  order by opening_at desc
  limit 1;

  -- El subtotal/impuesto/total se calculan aquí, nunca se confía en lo que
  -- mande el cliente.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_subtotal := v_subtotal
      + (v_item ->> 'unit_price')::numeric * (v_item ->> 'quantity')::numeric
      - coalesce((v_item ->> 'discount')::numeric, 0);
  end loop;

  v_taxable := greatest(0, v_subtotal - coalesce(p_discount, 0));
  v_tax := case when v_tax_enabled then round(v_taxable * v_tax_rate / 100, 2) else 0 end;
  v_total := v_taxable + v_tax;
  if v_total < 0 then
    raise exception 'El total de la venta no puede ser negativo';
  end if;

  for v_payment in select * from jsonb_array_elements(p_payments) loop
    v_paid := v_paid + (v_payment ->> 'amount')::numeric;
    if (v_payment ->> 'method') = 'credit' then
      v_credit_amount := v_credit_amount + (v_payment ->> 'amount')::numeric;
    end if;
  end loop;

  if v_paid < v_total then
    raise exception 'El pago no cubre el total de la venta';
  end if;

  if v_credit_amount > 0 then
    if p_customer_id is null then
      raise exception 'Se requiere un cliente para vender a fiado';
    end if;

    select credit_limit, credit_balance into v_customer_credit_limit, v_customer_credit_balance
    from customers
    where id = p_customer_id and store_id = v_store_id
    for update;

    if v_customer_credit_limit is null then
      raise exception 'El cliente no pertenece a esta tienda';
    end if;

    if v_customer_credit_balance + v_credit_amount > v_customer_credit_limit then
      raise exception 'El cliente excede su límite de crédito';
    end if;
  end if;

  insert into sales (
    id, store_id, employee_id, customer_id, cash_shift_id,
    subtotal, discount, tax, total, status, notes, client_created_at
  )
  values (
    p_sale_id, v_store_id, v_employee_id, p_customer_id, v_open_shift,
    v_subtotal, coalesce(p_discount, 0), v_tax, v_total, 'completed', p_notes, p_client_created_at
  )
  on conflict (id) do nothing;

  get diagnostics v_row_count = row_count;
  if v_row_count = 0 then
    return jsonb_build_object('id', p_sale_id, 'total', v_total, 'already_existed', true);
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    declare
      v_product_id uuid := (v_item ->> 'product_id')::uuid;
      v_qty numeric := (v_item ->> 'quantity')::numeric;
      v_price numeric := (v_item ->> 'unit_price')::numeric;
      v_disc numeric := coalesce((v_item ->> 'discount')::numeric, 0);
      v_product_cost numeric;
    begin
      select cost into v_product_cost from products where id = v_product_id and store_id = v_store_id;
      if v_product_cost is null then
        raise exception 'El producto % no pertenece a esta tienda', v_product_id;
      end if;

      insert into sale_items (store_id, sale_id, product_id, quantity, unit_price, unit_cost, discount, subtotal)
      values (v_store_id, p_sale_id, v_product_id, v_qty, v_price, v_product_cost, v_disc, v_price * v_qty - v_disc);

      update products set stock = stock - v_qty, updated_at = now()
      where id = v_product_id and store_id = v_store_id;

      insert into stock_movements (store_id, product_id, type, quantity, unit_cost, reference_id, created_by)
      values (v_store_id, v_product_id, 'sale', -v_qty, v_product_cost, p_sale_id, v_employee_id);
    end;
  end loop;

  for v_payment in select * from jsonb_array_elements(p_payments) loop
    insert into sale_payments (store_id, sale_id, method, amount, change_given)
    values (
      v_store_id, p_sale_id,
      (v_payment ->> 'method')::sale_payment_method,
      (v_payment ->> 'amount')::numeric,
      coalesce((v_payment ->> 'change_given')::numeric, 0)
    );
  end loop;

  if v_credit_amount > 0 then
    update customers set credit_balance = credit_balance + v_credit_amount, updated_at = now()
    where id = p_customer_id and store_id = v_store_id;
  end if;

  insert into audit_log (store_id, user_id, employee_id, action, entity_type, entity_id, metadata)
  values (
    v_store_id, auth.uid(), v_employee_id, 'sale.created', 'sale', p_sale_id,
    jsonb_build_object('total', v_total, 'tax', v_tax, 'items', jsonb_array_length(p_items))
  );

  return jsonb_build_object('id', p_sale_id, 'total', v_total, 'already_existed', false);
end;
$$;
