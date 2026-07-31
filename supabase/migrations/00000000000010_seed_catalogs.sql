-- =========================================================================
-- Fase 1 — Catálogo semilla por giro comercial (PRD 4.2, 5.A)
-- Función reutilizada por la Edge Function de provisión (Fase 9) y por los
-- tests/demo de esta fase. SECURITY DEFINER porque se invoca durante el
-- alta del tenant, antes de que el owner tenga aún una sesión con rol
-- resuelto vía auth_store_id().
-- =========================================================================

create function seed_store_catalog(p_store_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_business_type store_business_type;
  v_cat_id uuid;
begin
  select business_type into v_business_type from stores where id = p_store_id;

  if v_business_type is null then
    raise exception 'store % no existe', p_store_id;
  end if;

  if v_business_type = 'abarrotes' then
    insert into categories (store_id, name) values (p_store_id, 'Bebidas') returning id into v_cat_id;
    insert into products (store_id, category_id, barcode, name, price, cost, stock, unit_type, min_stock) values
      (p_store_id, v_cat_id, '7501055300956', 'Coca-Cola 600ml', 18.00, 12.50, 24, 'piece', 6),
      (p_store_id, v_cat_id, '7501055363159', 'Coca-Cola 2L', 38.00, 27.00, 12, 'piece', 4),
      (p_store_id, v_cat_id, '7501055363579', 'Sprite 600ml', 18.00, 12.50, 18, 'piece', 6),
      (p_store_id, v_cat_id, '7501058830012', 'Jarritos Tamarindo 370ml', 15.00, 10.00, 12, 'piece', 4);

    insert into categories (store_id, name) values (p_store_id, 'Panadería y lácteos') returning id into v_cat_id;
    insert into products (store_id, category_id, barcode, name, price, cost, stock, unit_type, min_stock) values
      (p_store_id, v_cat_id, '7501000538910', 'Bimbo Pan Blanco Grande', 42.00, 33.00, 10, 'piece', 3),
      (p_store_id, v_cat_id, '7501000132989', 'Bimbo Tortillas de Harina', 32.00, 24.00, 10, 'piece', 3),
      (p_store_id, v_cat_id, '7501020506018', 'Leche Lala Entera 1L', 26.50, 21.00, 20, 'piece', 6),
      (p_store_id, v_cat_id, '7501020515263', 'Danonino 4 pack', 28.00, 21.50, 12, 'piece', 4);

    insert into categories (store_id, name) values (p_store_id, 'Botanas y dulces') returning id into v_cat_id;
    insert into products (store_id, category_id, barcode, name, price, cost, stock, unit_type, min_stock) values
      (p_store_id, v_cat_id, '7501011127108', 'Sabritas Original 45g', 19.00, 13.50, 20, 'piece', 6),
      (p_store_id, v_cat_id, '7501011152780', 'Doritos Nacho 62g', 22.00, 16.00, 20, 'piece', 6),
      (p_store_id, v_cat_id, null, 'Chicles Trident', 12.00, 7.50, 15, 'piece', 5);

    insert into categories (store_id, name) values (p_store_id, 'Abarrotes básicos') returning id into v_cat_id;
    insert into products (store_id, category_id, barcode, name, price, cost, stock, unit_type, min_stock) values
      (p_store_id, v_cat_id, '7501020317508', 'Arroz Morelos 1kg', 32.00, 24.00, 15, 'piece', 4),
      (p_store_id, v_cat_id, '7501020317867', 'Azúcar Estándar 1kg', 28.00, 21.00, 15, 'piece', 4),
      (p_store_id, v_cat_id, '7501008046206', 'Aceite 1-2-3 1L', 46.00, 36.00, 12, 'piece', 4),
      (p_store_id, v_cat_id, '7501020505769', 'Maruchan Camarón', 15.00, 10.50, 20, 'piece', 6),
      (p_store_id, v_cat_id, null, 'Frijol negro a granel', 32.00, 22.00, 25, 'kg', 5),
      (p_store_id, v_cat_id, null, 'Huevo blanco a granel', 48.00, 36.00, 20, 'kg', 5),
      (p_store_id, v_cat_id, null, 'Tortilla de maíz a granel', 20.00, 14.00, 15, 'kg', 3);

    insert into categories (store_id, name) values (p_store_id, 'Limpieza') returning id into v_cat_id;
    insert into products (store_id, category_id, barcode, name, price, cost, stock, unit_type, min_stock) values
      (p_store_id, v_cat_id, '7501001635913', 'Cloralex 950ml', 24.00, 17.50, 10, 'piece', 3),
      (p_store_id, v_cat_id, '7501004310015', 'Jabón Zote', 14.00, 9.50, 15, 'piece', 4);

  elsif v_business_type = 'papeleria' then
    insert into categories (store_id, name) values (p_store_id, 'Escritura') returning id into v_cat_id;
    insert into products (store_id, category_id, barcode, name, price, cost, stock, unit_type, min_stock) values
      (p_store_id, v_cat_id, '7501234560012', 'Lápiz Mirado #2', 5.00, 2.80, 60, 'piece', 15),
      (p_store_id, v_cat_id, '7501234560029', 'Bolígrafo BIC Cristal Azul', 6.00, 3.20, 60, 'piece', 15),
      (p_store_id, v_cat_id, '7501234560036', 'Colores Prismacolor 12 pzas', 89.00, 65.00, 10, 'piece', 3),
      (p_store_id, v_cat_id, '7501234560104', 'Marcadores Sharpie c/4', 78.00, 58.00, 8, 'piece', 3);

    insert into categories (store_id, name) values (p_store_id, 'Papel y cuadernos') returning id into v_cat_id;
    insert into products (store_id, category_id, barcode, name, price, cost, stock, unit_type, min_stock) values
      (p_store_id, v_cat_id, '7501234560043', 'Cuaderno Profesional Scribe 100 hojas', 32.00, 22.00, 25, 'piece', 6),
      (p_store_id, v_cat_id, '7501234560050', 'Papel Bond Carta (paquete 500 hojas)', 115.00, 88.00, 8, 'piece', 2),
      (p_store_id, v_cat_id, '7501234560067', 'Folder Tamaño Carta', 4.50, 2.50, 100, 'piece', 20);

    insert into categories (store_id, name) values (p_store_id, 'Oficina y manualidades') returning id into v_cat_id;
    insert into products (store_id, category_id, barcode, name, price, cost, stock, unit_type, min_stock) values
      (p_store_id, v_cat_id, '7501234560074', 'Tijeras Scotch', 22.00, 14.00, 12, 'piece', 3),
      (p_store_id, v_cat_id, '7501234560081', 'Pegamento Resistol 850', 18.00, 11.50, 15, 'piece', 4),
      (p_store_id, v_cat_id, '7501234560098', 'Corrector Líquido', 15.00, 9.00, 15, 'piece', 4),
      (p_store_id, v_cat_id, '7501234560111', 'Cinta Adhesiva Diurex', 12.00, 7.00, 20, 'piece', 5),
      (p_store_id, v_cat_id, '7501234560128', 'Calculadora Casio Básica', 95.00, 70.00, 6, 'piece', 2),
      (p_store_id, v_cat_id, null, 'Copias / impresiones', 1.50, 0.40, 999, 'piece', 0);

  elsif v_business_type = 'farmacia' then
    insert into categories (store_id, name) values (p_store_id, 'Analgésicos y antigripales') returning id into v_cat_id;
    insert into products (store_id, category_id, barcode, name, price, cost, stock, unit_type, min_stock) values
      (p_store_id, v_cat_id, '7501230310015', 'Paracetamol 500mg c/10', 28.00, 18.00, 30, 'piece', 8),
      (p_store_id, v_cat_id, '7501230310022', 'Ibuprofeno 400mg c/10', 32.00, 21.00, 25, 'piece', 8),
      (p_store_id, v_cat_id, '7501230310039', 'Alka-Seltzer c/2', 18.00, 11.50, 20, 'piece', 6),
      (p_store_id, v_cat_id, '7501230310046', 'Halls Pastillas para la Tos', 12.00, 7.50, 25, 'piece', 6),
      (p_store_id, v_cat_id, '7501230310053', 'Sal de Uvas Picot', 22.00, 14.50, 15, 'piece', 4);

    insert into categories (store_id, name) values (p_store_id, 'Cuidado personal y primeros auxilios') returning id into v_cat_id;
    insert into products (store_id, category_id, barcode, name, price, cost, stock, unit_type, min_stock) values
      (p_store_id, v_cat_id, '7501230310060', 'Curitas Caja c/20', 24.00, 16.00, 15, 'piece', 4),
      (p_store_id, v_cat_id, '7501230310077', 'Alcohol en Gel 250ml', 32.00, 22.00, 20, 'piece', 5),
      (p_store_id, v_cat_id, '7501230310084', 'Gasas Estériles', 15.00, 9.50, 20, 'piece', 5),
      (p_store_id, v_cat_id, '7501230310091', 'Cubrebocas Caja c/50', 65.00, 45.00, 10, 'piece', 3),
      (p_store_id, v_cat_id, '7501230310107', 'Electrolit Suero Oral', 28.00, 19.00, 18, 'piece', 5);

    insert into categories (store_id, name) values (p_store_id, 'Salud sexual y pruebas') returning id into v_cat_id;
    insert into products (store_id, category_id, barcode, name, price, cost, stock, unit_type, min_stock) values
      (p_store_id, v_cat_id, '7501230310114', 'Condones Trojan c/3', 55.00, 38.00, 12, 'piece', 3),
      (p_store_id, v_cat_id, '7501230310121', 'Prueba de Embarazo', 45.00, 30.00, 10, 'piece', 3);

  elsif v_business_type = 'ferreteria' then
    insert into categories (store_id, name) values (p_store_id, 'Tornillería y sujeción') returning id into v_cat_id;
    insert into products (store_id, category_id, barcode, name, price, cost, stock, unit_type, min_stock) values
      (p_store_id, v_cat_id, null, 'Tornillos a granel', 120.00, 80.00, 8, 'kg', 2),
      (p_store_id, v_cat_id, null, 'Clavos 2" a granel', 45.00, 30.00, 10, 'kg', 2),
      (p_store_id, v_cat_id, '7501340010012', 'Candado Phillips 40mm', 65.00, 45.00, 12, 'piece', 3);

    insert into categories (store_id, name) values (p_store_id, 'Herramienta') returning id into v_cat_id;
    insert into products (store_id, category_id, barcode, name, price, cost, stock, unit_type, min_stock) values
      (p_store_id, v_cat_id, '7501340010029', 'Martillo de Uña 16oz', 145.00, 105.00, 6, 'piece', 2),
      (p_store_id, v_cat_id, '7501340010036', 'Desarmador Plano', 38.00, 25.00, 10, 'piece', 3),
      (p_store_id, v_cat_id, '7501340010043', 'Desarmador de Cruz', 38.00, 25.00, 10, 'piece', 3),
      (p_store_id, v_cat_id, '7501340010050', 'Cinta Métrica 5m', 55.00, 38.00, 8, 'piece', 2);

    insert into categories (store_id, name) values (p_store_id, 'Eléctrico') returning id into v_cat_id;
    insert into products (store_id, category_id, barcode, name, price, cost, stock, unit_type, min_stock) values
      (p_store_id, v_cat_id, '7501340010067', 'Foco LED 9W', 32.00, 21.00, 20, 'piece', 5),
      (p_store_id, v_cat_id, null, 'Cable Eléctrico THW a granel', 15.00, 9.50, 100, 'm', 20),
      (p_store_id, v_cat_id, '7501340010074', 'Cinta Aislante', 18.00, 11.00, 15, 'piece', 4),
      (p_store_id, v_cat_id, '7501340010081', 'Pilas AA Duracell c/4', 68.00, 48.00, 15, 'piece', 4);

    insert into categories (store_id, name) values (p_store_id, 'Pintura y varios') returning id into v_cat_id;
    insert into products (store_id, category_id, barcode, name, price, cost, stock, unit_type, min_stock) values
      (p_store_id, v_cat_id, '7501340010098', 'Pintura Vinílica 1L', 95.00, 68.00, 8, 'piece', 2),
      (p_store_id, v_cat_id, '7501340010104', 'Brocha 2"', 25.00, 15.00, 12, 'piece', 3),
      (p_store_id, v_cat_id, null, 'Manguera de Jardín a granel', 28.00, 18.00, 30, 'm', 5);
  end if;
end;
$$;
