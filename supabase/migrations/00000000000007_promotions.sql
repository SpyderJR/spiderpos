-- =========================================================================
-- Fase 1 — Promociones y precios inteligentes (PRD 5.I)
-- =========================================================================

create type promotion_type as enum ('percentage', 'fixed', '2x1', '3x2', 'bulk_price');

create table promotions (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references stores(id) on delete cascade,
  name          text not null,
  type          promotion_type not null,
  value         numeric(12,2),
  min_quantity  numeric(12,3),
  product_id    uuid references products(id) on delete cascade,
  category_id   uuid references categories(id) on delete cascade,
  starts_at     timestamptz,
  ends_at       timestamptz,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create index idx_promotions_store on promotions(store_id);
create index idx_promotions_store_active on promotions(store_id, active);

alter table promotions enable row level security;

create policy tenant_isolation_select on promotions for select using (store_id = auth_store_id());
create policy tenant_isolation_write on promotions for all
  using (store_id = auth_store_id() and auth_role() in ('owner', 'manager'))
  with check (store_id = auth_store_id() and auth_role() in ('owner', 'manager'));
