-- =========================================================================
-- Fase 1 — Recargas electrónicas y pago de servicios (PRD 5.C)
-- Idempotencia por folio del proveedor: una recarga jamás se cobra dos
-- veces, incluso si la confirmación asíncrona llega duplicada.
-- =========================================================================

create type recharge_status as enum ('pending', 'completed', 'failed');

create table recharge_transactions (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references stores(id) on delete cascade,
  employee_id   uuid references store_members(id) on delete set null,
  provider      text not null,
  folio         text,
  phone_number  text,
  amount        numeric(12,2) not null check (amount > 0),
  commission    numeric(12,2) not null default 0,
  status        recharge_status not null default 'pending',
  created_at    timestamptz not null default now()
);

create index idx_recharge_transactions_store on recharge_transactions(store_id);
create unique index idx_recharge_transactions_idempotency
  on recharge_transactions(provider, folio) where folio is not null;

alter table recharge_transactions enable row level security;

create policy tenant_isolation_select on recharge_transactions for select using (store_id = auth_store_id());
create policy tenant_isolation_insert on recharge_transactions for insert with check (store_id = auth_store_id());
