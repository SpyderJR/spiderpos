-- =========================================================================
-- Fase 1 — Catálogo, inventario, proveedores y compras (PRD 5.E)
-- =========================================================================

create type product_unit_type as enum ('piece', 'kg', 'g', 'lt', 'm');
create type purchase_order_status as enum ('draft', 'ordered', 'received', 'cancelled');
create type stock_movement_type as enum ('sale', 'purchase', 'adjustment', 'return', 'initial');

create table categories (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references stores(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (store_id, name)
);

create index idx_categories_store on categories(store_id);

create table products (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  barcode     text,
  name        text not null,
  description text,
  price       numeric(12,2) not null check (price >= 0),
  cost        numeric(12,2) not null default 0 check (cost >= 0),
  stock       numeric(12,3) not null default 0,
  unit_type   product_unit_type not null default 'piece',
  min_stock   numeric(12,3) not null default 0,
  is_favorite boolean not null default false,
  image_url   text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_products_store on products(store_id);
create index idx_products_store_barcode on products(store_id, barcode);
create index idx_products_store_favorite on products(store_id, is_favorite) where is_favorite = true;
create index idx_products_store_low_stock on products(store_id) where stock <= min_stock;

-- Variantes/presentaciones del mismo producto (pieza/caja/paquete) con
-- factor de conversión hacia la unidad base del producto.
create table product_variants (
  id                 uuid primary key default gen_random_uuid(),
  store_id           uuid not null references stores(id) on delete cascade,
  product_id         uuid not null references products(id) on delete cascade,
  name               text not null,
  barcode            text,
  conversion_factor  numeric(12,4) not null default 1 check (conversion_factor > 0),
  price              numeric(12,2) not null check (price >= 0),
  cost               numeric(12,2) not null default 0 check (cost >= 0),
  created_at         timestamptz not null default now()
);

create index idx_product_variants_store on product_variants(store_id);
create index idx_product_variants_product on product_variants(product_id);

create table suppliers (
  id             uuid primary key default gen_random_uuid(),
  store_id       uuid not null references stores(id) on delete cascade,
  name           text not null,
  contact_phone  text,
  contact_email  text,
  visit_days     text[] not null default '{}',
  notes          text,
  created_at     timestamptz not null default now()
);

create index idx_suppliers_store on suppliers(store_id);

create table purchase_orders (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references stores(id) on delete cascade,
  supplier_id  uuid references suppliers(id) on delete set null,
  status       purchase_order_status not null default 'draft',
  total        numeric(12,2) not null default 0,
  created_by   uuid references store_members(id) on delete set null,
  created_at   timestamptz not null default now(),
  received_at  timestamptz
);

create index idx_purchase_orders_store on purchase_orders(store_id);

create table purchase_order_items (
  id                 uuid primary key default gen_random_uuid(),
  store_id           uuid not null references stores(id) on delete cascade,
  purchase_order_id  uuid not null references purchase_orders(id) on delete cascade,
  product_id         uuid not null references products(id) on delete restrict,
  quantity           numeric(12,3) not null check (quantity > 0),
  unit_cost          numeric(12,2) not null check (unit_cost >= 0)
);

create index idx_purchase_order_items_store on purchase_order_items(store_id);
create index idx_purchase_order_items_order on purchase_order_items(purchase_order_id);

-- Bitácora de movimientos de stock: base del costo promedio ponderado y de
-- la auditoría de ajustes manuales (PRD 5.E, 5.H).
create table stock_movements (
  id             uuid primary key default gen_random_uuid(),
  store_id       uuid not null references stores(id) on delete cascade,
  product_id     uuid not null references products(id) on delete cascade,
  type           stock_movement_type not null,
  quantity       numeric(12,3) not null,
  unit_cost      numeric(12,2),
  reason         text,
  reference_id   uuid,
  created_by     uuid references store_members(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index idx_stock_movements_store on stock_movements(store_id);
create index idx_stock_movements_product on stock_movements(store_id, product_id);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table categories enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table suppliers enable row level security;
alter table purchase_orders enable row level security;
alter table purchase_order_items enable row level security;
alter table stock_movements enable row level security;

create policy tenant_isolation_select on categories for select using (store_id = auth_store_id());
create policy tenant_isolation_write on categories for all
  using (store_id = auth_store_id() and (auth_role() in ('owner', 'manager') or auth_has_permission('manage_inventory')))
  with check (store_id = auth_store_id() and (auth_role() in ('owner', 'manager') or auth_has_permission('manage_inventory')));

create policy tenant_isolation_select on products for select using (store_id = auth_store_id());
create policy tenant_isolation_write on products for all
  using (store_id = auth_store_id() and (auth_role() in ('owner', 'manager') or auth_has_permission('manage_inventory')))
  with check (store_id = auth_store_id() and (auth_role() in ('owner', 'manager') or auth_has_permission('manage_inventory')));

create policy tenant_isolation_select on product_variants for select using (store_id = auth_store_id());
create policy tenant_isolation_write on product_variants for all
  using (store_id = auth_store_id() and (auth_role() in ('owner', 'manager') or auth_has_permission('manage_inventory')))
  with check (store_id = auth_store_id() and (auth_role() in ('owner', 'manager') or auth_has_permission('manage_inventory')));

create policy tenant_isolation_select on suppliers for select using (store_id = auth_store_id());
create policy tenant_isolation_write on suppliers for all
  using (store_id = auth_store_id() and (auth_role() in ('owner', 'manager') or auth_has_permission('manage_inventory')))
  with check (store_id = auth_store_id() and (auth_role() in ('owner', 'manager') or auth_has_permission('manage_inventory')));

create policy tenant_isolation_select on purchase_orders for select using (store_id = auth_store_id());
create policy tenant_isolation_write on purchase_orders for all
  using (store_id = auth_store_id() and (auth_role() in ('owner', 'manager') or auth_has_permission('manage_inventory')))
  with check (store_id = auth_store_id() and (auth_role() in ('owner', 'manager') or auth_has_permission('manage_inventory')));

create policy tenant_isolation_select on purchase_order_items for select using (store_id = auth_store_id());
create policy tenant_isolation_write on purchase_order_items for all
  using (store_id = auth_store_id() and (auth_role() in ('owner', 'manager') or auth_has_permission('manage_inventory')))
  with check (store_id = auth_store_id() and (auth_role() in ('owner', 'manager') or auth_has_permission('manage_inventory')));

create policy tenant_isolation_select on stock_movements for select using (store_id = auth_store_id());
create policy tenant_isolation_insert on stock_movements for insert
  with check (store_id = auth_store_id());
