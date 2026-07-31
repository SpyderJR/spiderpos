-- =========================================================================
-- Fase 1 — Núcleo multi-tenant: stores, store_members, subscriptions
-- Patrón obligatorio (PRD 3.2): toda tabla de negocio lleva store_id y RLS.
-- =========================================================================

create type store_business_type as enum ('abarrotes', 'papeleria', 'farmacia', 'ferreteria');
create type store_role as enum ('owner', 'manager', 'cashier');
create type subscription_status as enum ('trialing', 'active', 'past_due', 'suspended', 'cancelled');
create type subscription_plan as enum ('monthly', 'annual');
create type subscription_provider as enum ('stripe', 'mercadopago');

create table stores (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  business_type         store_business_type not null,
  logo_url              text,
  tax_data              jsonb not null default '{}'::jsonb,
  address               text,
  phone                 text,
  footer_message        text,
  subscription_status   subscription_status not null default 'trialing',
  plan                  subscription_plan,
  trial_ends_at         timestamptz,
  payout_clabe          text,
  payout_mp_account_id  text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table store_members (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  store_id     uuid not null references stores(id) on delete cascade,
  role         store_role not null default 'cashier',
  full_name    text not null,
  pin_hash     text,
  permissions  jsonb not null default '{}'::jsonb,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id)
);

create index idx_store_members_store on store_members(store_id);

create table subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  store_id           uuid not null references stores(id) on delete cascade,
  provider           subscription_provider not null,
  provider_sub_id    text,
  status             subscription_status not null default 'trialing',
  plan               subscription_plan not null,
  current_period_end timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (store_id)
);

-- ---------------------------------------------------------------------
-- Funciones helper de autenticación multi-tenant (PRD 3.2.2)
-- ---------------------------------------------------------------------

create function auth_store_id() returns uuid
language sql stable security definer set search_path = public as $$
  select store_id from store_members where user_id = auth.uid() limit 1;
$$;

create function auth_role() returns store_role
language sql stable security definer set search_path = public as $$
  select role from store_members where user_id = auth.uid() and store_id = auth_store_id();
$$;

-- Owner siempre tiene todos los permisos; el resto se evalúa contra la
-- columna permissions (JSONB) de store_members. Los defaults por rol se
-- fijan al insertar el empleado (Fase 2), no aquí.
create function auth_has_permission(perm text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when auth_role() = 'owner' then true
    else coalesce(
      (select (permissions ->> perm)::boolean
       from store_members
       where user_id = auth.uid() and store_id = auth_store_id()),
      false
    )
  end;
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table stores enable row level security;
alter table store_members enable row level security;
alter table subscriptions enable row level security;

-- stores: cualquier miembro puede leer su propia tienda; solo el owner la edita.
create policy tenant_isolation_select on stores
  for select using (id = auth_store_id());

create policy tenant_isolation_update on stores
  for update using (id = auth_store_id() and auth_role() = 'owner')
  with check (id = auth_store_id() and auth_role() = 'owner');

-- store_members: visibles solo dentro de la misma tienda; solo owner/manager
-- gestionan personal.
create policy tenant_isolation_select on store_members
  for select using (store_id = auth_store_id());

create policy tenant_isolation_write on store_members
  for insert with check (store_id = auth_store_id() and auth_role() in ('owner', 'manager'));

create policy tenant_isolation_update on store_members
  for update using (store_id = auth_store_id() and auth_role() in ('owner', 'manager'))
  with check (store_id = auth_store_id() and auth_role() in ('owner', 'manager'));

create policy tenant_isolation_delete on store_members
  for delete using (store_id = auth_store_id() and auth_role() = 'owner');

-- subscriptions: solo lectura para miembros de la tienda; la escritura la
-- hacen exclusivamente las Edge Functions con service_role (bypassa RLS).
create policy tenant_isolation_select on subscriptions
  for select using (store_id = auth_store_id());
