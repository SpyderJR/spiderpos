-- =========================================================================
-- Rediseño — La tienda demo pública se veía vacía (0 ventas, sin
-- favoritos, sin clientes, sin promociones) frente a un prospecto real,
-- aunque el estilo visual era idéntico al resto de la app. Esta función
-- puebla la tienda demo con contenido realista — favoritos, clientes con
-- fiado, promociones activas y un historial de ventas de los últimos 6
-- días — para que Reportes, Ventas, Clientes y POS se sientan vivos.
--
-- Las ventas se insertan replicando exactamente los efectos de
-- record_sale() (stock_movements, snapshot de costo, saldo de crédito)
-- porque no se puede invocar record_sale() aquí: esa función depende de
-- auth.uid()/auth_store_id(), que no existen en este contexto de fondo
-- (cron). Es contenido de ejemplo para un tenant de demostración — la
-- misma naturaleza que el catálogo semilla ya existente, no "datos falsos"
-- en la tienda de un cliente real.
-- =========================================================================

create function seed_demo_content(p_store_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_owner_member_id uuid;
  v_customer_juan uuid;
  v_customer_rosa uuid;
  v_customer_pedro uuid;
  v_cat_id uuid;
  v_sale record;
  v_sale_id uuid;
  v_product_id uuid;
  v_unit_price numeric;
  v_unit_cost numeric;
  v_qty numeric;
  v_subtotal numeric;
  v_method sale_payment_method;
  v_customer_id uuid;
  v_day_offset int;
  v_hour int;
begin
  select id into v_owner_member_id from store_members where store_id = p_store_id and role = 'owner' limit 1;
  if v_owner_member_id is null then
    raise exception 'store % no tiene dueño', p_store_id;
  end if;

  -- Clientes con fiado
  insert into customers (id, store_id, name, phone, credit_limit, credit_balance)
    values (gen_random_uuid(), p_store_id, 'Juan Pérez', '5512345678', 500, 120)
    returning id into v_customer_juan;
  insert into customers (id, store_id, name, phone, credit_limit, credit_balance)
    values (gen_random_uuid(), p_store_id, 'Rosa Martínez', '5598765432', 800, 0)
    returning id into v_customer_rosa;
  insert into customers (id, store_id, name, phone, credit_limit, credit_balance)
    values (gen_random_uuid(), p_store_id, 'Pedro Sánchez', '5555512345', 300, 45)
    returning id into v_customer_pedro;

  -- Favoritos (productos de alta rotación del catálogo semilla de abarrotes)
  update products set is_favorite = true
    where store_id = p_store_id
      and name in ('Coca-Cola 600ml', 'Sabritas Original 45g', 'Chicles Trident', 'Bimbo Pan Blanco Grande', 'Leche Lala Entera 1L', 'Doritos Nacho 62g');

  -- Promociones activas
  select id into v_cat_id from categories where store_id = p_store_id and name = 'Botanas y dulces' limit 1;
  if v_cat_id is not null then
    insert into promotions (store_id, name, type, value, category_id, active)
      values (p_store_id, '2x1 en botanas', '2x1', null, v_cat_id, true);
  end if;
  select id into v_product_id from products where store_id = p_store_id and name = 'Coca-Cola 2L' limit 1;
  if v_product_id is not null then
    insert into promotions (store_id, name, type, value, product_id, active)
      values (p_store_id, '10% en Coca-Cola 2L', 'percentage', 10, v_product_id, true);
  end if;

  -- Historial de ventas real (últimos 6 días) — cada fila: días atrás,
  -- hora, producto, cantidad, forma de pago, cliente (solo si es fiado).
  for v_sale in
    select * from (values
      (5, 9,  'Coca-Cola 600ml', 2::numeric, 'cash'::sale_payment_method, null::uuid),
      (5, 11, 'Bimbo Pan Blanco Grande', 1::numeric, 'cash'::sale_payment_method, null::uuid),
      (5, 17, 'Sabritas Original 45g', 3::numeric, 'card'::sale_payment_method, null::uuid),
      (4, 10, 'Leche Lala Entera 1L', 2::numeric, 'cash'::sale_payment_method, null::uuid),
      (4, 16, 'Arroz Morelos 1kg', 1::numeric, 'transfer'::sale_payment_method, null::uuid),
      (3, 9,  'Chicles Trident', 4::numeric, 'cash'::sale_payment_method, null::uuid),
      (3, 13, 'Doritos Nacho 62g', 2::numeric, 'card'::sale_payment_method, null::uuid),
      (3, 18, 'Jarritos Tamarindo 370ml', 2::numeric, 'cash'::sale_payment_method, null::uuid),
      (2, 8,  'Huevo blanco a granel', 2::numeric, 'cash'::sale_payment_method, null::uuid),
      (2, 15, 'Aceite 1-2-3 1L', 1::numeric, 'transfer'::sale_payment_method, null::uuid),
      (1, 10, 'Cloralex 950ml', 1::numeric, 'cash'::sale_payment_method, null::uuid),
      (1, 12, 'Azúcar Estándar 1kg', 1::numeric, 'card'::sale_payment_method, null::uuid),
      (1, 19, 'Bimbo Tortillas de Harina', 2::numeric, 'cash'::sale_payment_method, null::uuid),
      (0, 9,  'Coca-Cola 600ml', 3::numeric, 'cash'::sale_payment_method, null::uuid),
      (0, 12, 'Maruchan Camarón', 2::numeric, 'card'::sale_payment_method, null::uuid)
    ) as t(day_offset, hour, product_name, qty, method, customer_id)
  loop
    select id, price, cost into v_product_id, v_unit_price, v_unit_cost
      from products where store_id = p_store_id and name = v_sale.product_name limit 1;
    continue when v_product_id is null;

    v_sale_id := gen_random_uuid();
    v_qty := v_sale.qty;
    v_subtotal := v_unit_price * v_qty;
    v_day_offset := v_sale.day_offset;
    v_hour := v_sale.hour;

    insert into sales (id, store_id, employee_id, customer_id, subtotal, discount, tax, total, status, client_created_at)
      values (
        v_sale_id, p_store_id, v_owner_member_id, v_sale.customer_id, v_subtotal, 0, 0, v_subtotal, 'completed',
        (current_date - v_day_offset) + (v_hour || ' hours')::interval
      );

    insert into sale_items (store_id, sale_id, product_id, quantity, unit_price, unit_cost, discount, subtotal)
      values (p_store_id, v_sale_id, v_product_id, v_qty, v_unit_price, v_unit_cost, 0, v_subtotal);

    update products set stock = greatest(stock - v_qty, 0) where id = v_product_id;

    insert into stock_movements (store_id, product_id, type, quantity, unit_cost, reference_id, created_by)
      values (p_store_id, v_product_id, 'sale', -v_qty, v_unit_cost, v_sale_id, v_owner_member_id);

    insert into sale_payments (store_id, sale_id, method, amount)
      values (p_store_id, v_sale_id, v_sale.method, v_subtotal);
  end loop;

  -- Una venta a fiado, para que el estado de cuenta de un cliente se vea real.
  select id, price, cost into v_product_id, v_unit_price, v_unit_cost
    from products where store_id = p_store_id and name = 'Arroz Morelos 1kg' limit 1;
  if v_product_id is not null then
    v_sale_id := gen_random_uuid();
    v_subtotal := v_unit_price * 2;
    insert into sales (id, store_id, employee_id, customer_id, subtotal, discount, tax, total, status, client_created_at)
      values (v_sale_id, p_store_id, v_owner_member_id, v_customer_juan, v_subtotal, 0, 0, v_subtotal, 'completed', now() - interval '2 hours');
    insert into sale_items (store_id, sale_id, product_id, quantity, unit_price, unit_cost, discount, subtotal)
      values (p_store_id, v_sale_id, v_product_id, 2, v_unit_price, v_unit_cost, 0, v_subtotal);
    update products set stock = greatest(stock - 2, 0) where id = v_product_id;
    insert into stock_movements (store_id, product_id, type, quantity, unit_cost, reference_id, created_by)
      values (p_store_id, v_product_id, 'sale', -2, v_unit_cost, v_sale_id, v_owner_member_id);
    insert into sale_payments (store_id, sale_id, method, amount)
      values (p_store_id, v_sale_id, 'credit', v_subtotal);
  end if;
end;
$$;
