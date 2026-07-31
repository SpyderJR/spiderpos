-- =========================================================================
-- Fase 1 — Bitácora de auditoría inmutable (PRD 5.H)
-- Sin política de UPDATE ni DELETE: una vez insertada, ninguna fila es
-- modificable ni borrable desde el cliente (RLS deniega por defecto
-- cualquier operación sin política que la cubra explícitamente).
-- =========================================================================

create table audit_log (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  user_id     uuid not null references auth.users(id),
  employee_id uuid references store_members(id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index idx_audit_log_store on audit_log(store_id);
create index idx_audit_log_store_created on audit_log(store_id, created_at desc);

alter table audit_log enable row level security;

-- Cualquier miembro puede insertar su propio registro de auditoría (queda
-- vinculado a su propio user_id, no puede suplantar a otro empleado).
create policy tenant_isolation_insert on audit_log for insert
  with check (store_id = auth_store_id() and user_id = auth.uid());

-- Solo owner/manager consultan la bitácora completa (PRD 5.H: "resolver
-- disputas y detectar fraude interno").
create policy tenant_isolation_select on audit_log for select
  using (store_id = auth_store_id() and auth_role() in ('owner', 'manager'));
