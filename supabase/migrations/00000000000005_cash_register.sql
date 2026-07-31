-- =========================================================================
-- Fase 1 — Caja: apertura/cierre de turno y corte ciego (PRD 5.G)
-- =========================================================================

create type cash_shift_status as enum ('open', 'closed');
create type cash_movement_type as enum ('in', 'out');

create table cash_shifts (
  id                          uuid primary key default gen_random_uuid(),
  store_id                    uuid not null references stores(id) on delete cascade,
  employee_id                 uuid not null references store_members(id) on delete restrict,
  opening_amount              numeric(12,2) not null default 0 check (opening_amount >= 0),
  opening_at                  timestamptz not null default now(),
  closing_amount_theoretical  numeric(12,2),
  closing_amount_counted      numeric(12,2),
  difference                  numeric(12,2),
  closing_at                  timestamptz,
  status                      cash_shift_status not null default 'open',
  created_at                  timestamptz not null default now()
);

create index idx_cash_shifts_store on cash_shifts(store_id);
create index idx_cash_shifts_store_status on cash_shifts(store_id, status);

create table cash_movements (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references stores(id) on delete cascade,
  cash_shift_id uuid not null references cash_shifts(id) on delete cascade,
  type          cash_movement_type not null,
  amount        numeric(12,2) not null check (amount > 0),
  reason        text not null,
  created_by    uuid references store_members(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index idx_cash_movements_store on cash_movements(store_id);
create index idx_cash_movements_shift on cash_movements(cash_shift_id);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table cash_shifts enable row level security;
alter table cash_movements enable row level security;

create policy tenant_isolation_select on cash_shifts for select using (store_id = auth_store_id());
create policy tenant_isolation_insert on cash_shifts for insert with check (store_id = auth_store_id());
-- El cierre de turno (corte ciego) lo hace el propio cajero que lo abrió, o un manager/owner.
create policy tenant_isolation_update on cash_shifts for update
  using (
    store_id = auth_store_id()
    and (employee_id = (select id from store_members where user_id = auth.uid() and store_id = auth_store_id())
         or auth_role() in ('owner', 'manager'))
  )
  with check (store_id = auth_store_id());

create policy tenant_isolation_select on cash_movements for select using (store_id = auth_store_id());
create policy tenant_isolation_insert on cash_movements for insert with check (store_id = auth_store_id());
