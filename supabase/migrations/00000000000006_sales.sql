-- =========================================================================
-- Fase 1 — Ventas / POS: append-only, offline-first (PRD 5.B y 6)
-- El id de la venta lo genera el cliente (UUID) desde el momento de la
-- captura, incluso sin internet. Al sincronizar se inserta con ese mismo
-- id, por lo que un reintento nunca duplica la venta (ON CONFLICT DO
-- NOTHING la vuelve idempotente).
-- =========================================================================

create type sale_status as enum ('completed', 'parked', 'cancelled', 'returned', 'partially_returned');
create type sale_payment_method as enum ('cash', 'card', 'transfer', 'credit');

create table sales (
  id                 uuid primary key,
  store_id           uuid not null references stores(id) on delete cascade,
  employee_id        uuid not null references store_members(id) on delete restrict,
  customer_id        uuid references customers(id) on delete set null,
  cash_shift_id      uuid references cash_shifts(id) on delete set null,
  subtotal           numeric(12,2) not null default 0,
  discount           numeric(12,2) not null default 0,
  tax                numeric(12,2) not null default 0,
  total              numeric(12,2) not null default 0,
  status             sale_status not null default 'completed',
  notes              text,
  cancelled_reason   text,
  cancelled_by       uuid references store_members(id),
  -- Momento real de la venta en el dispositivo (offline-capable), distinto
  -- de created_at que es cuándo llegó al servidor.
  client_created_at  timestamptz not null,
  created_at         timestamptz not null default now()
);

create index idx_sales_store on sales(store_id);
create index idx_sales_store_client_created on sales(store_id, client_created_at);
create index idx_sales_store_status on sales(store_id, status);

create table sale_items (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  sale_id     uuid not null references sales(id) on delete cascade,
  product_id  uuid not null references products(id) on delete restrict,
  quantity    numeric(12,3) not null check (quantity > 0),
  unit_price  numeric(12,2) not null check (unit_price >= 0),
  -- Costo unitario al momento de la venta (snapshot) — base del margen real (PRD 5.G).
  unit_cost   numeric(12,2) not null default 0,
  discount    numeric(12,2) not null default 0,
  subtotal    numeric(12,2) not null
);

create index idx_sale_items_store on sale_items(store_id);
create index idx_sale_items_sale on sale_items(sale_id);

create table sale_payments (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references stores(id) on delete cascade,
  sale_id       uuid not null references sales(id) on delete cascade,
  method        sale_payment_method not null,
  amount        numeric(12,2) not null check (amount > 0),
  change_given  numeric(12,2) not null default 0,
  created_at    timestamptz not null default now()
);

create index idx_sale_payments_store on sale_payments(store_id);
create index idx_sale_payments_sale on sale_payments(sale_id);

-- Devoluciones (PRD 5.H)
create table returns (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references stores(id) on delete cascade,
  sale_id         uuid not null references sales(id) on delete restrict,
  reason          text not null,
  total_returned  numeric(12,2) not null check (total_returned >= 0),
  created_by      uuid references store_members(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index idx_returns_store on returns(store_id);
create index idx_returns_sale on returns(sale_id);

create table return_items (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references stores(id) on delete cascade,
  return_id     uuid not null references returns(id) on delete cascade,
  sale_item_id  uuid not null references sale_items(id) on delete restrict,
  quantity      numeric(12,3) not null check (quantity > 0)
);

create index idx_return_items_store on return_items(store_id);
create index idx_return_items_return on return_items(return_id);

-- ---------------------------------------------------------------------
-- RLS
-- Nota: el registro atómico de una venta (descuento de stock, movimiento
-- de inventario y bitácora en una sola transacción) se expone como función
-- RPC SECURITY DEFINER en la Fase 3 — aquí solo se define el esquema y el
-- aislamiento por tienda. Cancelar una venta ya completada requiere rol
-- manager/owner o PIN de supervisor (RPC de la Fase 8).
-- ---------------------------------------------------------------------

alter table sales enable row level security;
alter table sale_items enable row level security;
alter table sale_payments enable row level security;
alter table returns enable row level security;
alter table return_items enable row level security;

create policy tenant_isolation_select on sales for select using (store_id = auth_store_id());
create policy tenant_isolation_insert on sales for insert with check (store_id = auth_store_id());
create policy tenant_isolation_update on sales for update
  using (store_id = auth_store_id() and auth_role() in ('owner', 'manager'))
  with check (store_id = auth_store_id() and auth_role() in ('owner', 'manager'));

create policy tenant_isolation_select on sale_items for select using (store_id = auth_store_id());
create policy tenant_isolation_insert on sale_items for insert with check (store_id = auth_store_id());

create policy tenant_isolation_select on sale_payments for select using (store_id = auth_store_id());
create policy tenant_isolation_insert on sale_payments for insert with check (store_id = auth_store_id());

create policy tenant_isolation_select on returns for select using (store_id = auth_store_id());
create policy tenant_isolation_insert on returns for insert
  with check (store_id = auth_store_id() and (auth_role() in ('owner', 'manager') or auth_has_permission('process_returns')));

create policy tenant_isolation_select on return_items for select using (store_id = auth_store_id());
create policy tenant_isolation_insert on return_items for insert
  with check (store_id = auth_store_id() and (auth_role() in ('owner', 'manager') or auth_has_permission('process_returns')));
