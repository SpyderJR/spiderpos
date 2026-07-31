-- =========================================================================
-- Fase 1 — Clientes y "fiados" (PRD 5.F)
-- =========================================================================

create table customers (
  id             uuid primary key default gen_random_uuid(),
  store_id       uuid not null references stores(id) on delete cascade,
  name           text not null,
  phone          text,
  email          text,
  credit_limit   numeric(12,2) not null default 0 check (credit_limit >= 0),
  credit_balance numeric(12,2) not null default 0,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_customers_store on customers(store_id);
create index idx_customers_store_phone on customers(store_id, phone);

-- Abonos (pagos parciales del cliente a su saldo de fiado). Append-only.
create table customer_payments (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  amount      numeric(12,2) not null check (amount > 0),
  method      text not null default 'cash',
  note        text,
  created_by  uuid references store_members(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index idx_customer_payments_store on customer_payments(store_id);
create index idx_customer_payments_customer on customer_payments(store_id, customer_id);

-- Precios especiales por cliente (clientes frecuentes / mayoristas, PRD 5.I)
create table customer_prices (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  product_id  uuid not null references products(id) on delete cascade,
  price       numeric(12,2) not null check (price >= 0),
  created_at  timestamptz not null default now(),
  unique (store_id, customer_id, product_id)
);

create index idx_customer_prices_store on customer_prices(store_id);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table customers enable row level security;
alter table customer_payments enable row level security;
alter table customer_prices enable row level security;

create policy tenant_isolation_select on customers for select using (store_id = auth_store_id());
create policy tenant_isolation_insert on customers for insert with check (store_id = auth_store_id());
create policy tenant_isolation_update on customers for update
  using (store_id = auth_store_id() and (auth_role() in ('owner', 'manager') or auth_has_permission('manage_customers')))
  with check (store_id = auth_store_id() and (auth_role() in ('owner', 'manager') or auth_has_permission('manage_customers')));
create policy tenant_isolation_delete on customers for delete
  using (store_id = auth_store_id() and auth_role() in ('owner', 'manager'));

create policy tenant_isolation_select on customer_payments for select using (store_id = auth_store_id());
create policy tenant_isolation_insert on customer_payments for insert with check (store_id = auth_store_id());

create policy tenant_isolation_select on customer_prices for select using (store_id = auth_store_id());
create policy tenant_isolation_write on customer_prices for all
  using (store_id = auth_store_id() and auth_role() in ('owner', 'manager'))
  with check (store_id = auth_store_id() and auth_role() in ('owner', 'manager'));
