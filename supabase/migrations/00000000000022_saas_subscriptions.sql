-- =========================================================================
-- Fase 9 — Suscripciones SaaS con Mercado Pago (PRD 4, 5.J).
--
-- pending_signups: datos del formulario de registro público, guardados
-- ANTES de que exista pago o tenant, indexados por external_reference
-- (el mismo id que se manda a Mercado Pago). El webhook los consume una
-- sola vez para provisionar el tenant.
--
-- webhook_events: ledger de idempotencia. Mercado Pago reintenta
-- notificaciones; un mismo evento (provider + event id) nunca se procesa
-- dos veces gracias al unique constraint + ON CONFLICT DO NOTHING.
--
-- subscription_payments: historial de cobros (éxito y fallo) por
-- suscripción, para mostrar en el backoffice y calcular MRR/churn.
--
-- platform_admins: opera fuera del esquema multi-tenant (un super admin
-- no pertenece a ninguna tienda). Solo filas insertadas manualmente por
-- el operador del SaaS vía service_role.
-- =========================================================================

create type signup_status as enum ('pending', 'provisioned', 'expired');
create type webhook_provider as enum ('mercadopago');
create type payment_status as enum ('approved', 'rejected', 'pending', 'refunded');

create table pending_signups (
  id              uuid primary key default gen_random_uuid(),
  business_name   text not null,
  business_type   store_business_type not null,
  owner_full_name text not null,
  owner_email     text not null,
  plan            subscription_plan not null,
  status          signup_status not null default 'pending',
  provider_sub_id text,
  store_id        uuid references stores(id) on delete set null,
  created_at      timestamptz not null default now(),
  provisioned_at  timestamptz
);

create table webhook_events (
  id           text not null,
  provider     webhook_provider not null,
  event_type   text not null,
  payload      jsonb not null default '{}'::jsonb,
  received_at  timestamptz not null default now(),
  primary key (provider, id)
);

create table subscription_payments (
  id                  uuid primary key default gen_random_uuid(),
  subscription_id     uuid not null references subscriptions(id) on delete cascade,
  store_id            uuid not null references stores(id) on delete cascade,
  provider_payment_id text not null,
  amount              numeric(10, 2) not null,
  status              payment_status not null,
  paid_at             timestamptz,
  created_at          timestamptz not null default now(),
  unique (provider_payment_id)
);

create index idx_subscription_payments_store on subscription_payments(store_id, created_at desc);

create table platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table pending_signups enable row level security;
alter table webhook_events enable row level security;
alter table platform_admins enable row level security;
alter table subscription_payments enable row level security;
-- pending_signups / webhook_events / platform_admins: sin políticas —
-- solo accesibles vía service_role (Edge Functions), igual que
-- pin_login_attempts.

create policy tenant_isolation_select on subscription_payments
  for select using (store_id = auth_store_id());

-- ---------------------------------------------------------------------
-- Helper: ¿el usuario autenticado es super admin de la plataforma?
-- ---------------------------------------------------------------------

create function is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- Métricas de negocio para el panel súper admin (PRD 5.J).
-- MRR: suma de suscripciones activas normalizada a mensual (anual / 12).
-- Churn 30d: tiendas canceladas en los últimos 30 días / activas hace 30 días.
-- ---------------------------------------------------------------------

create function get_platform_metrics() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_mrr numeric;
  v_active_count int;
  v_trialing_count int;
  v_suspended_count int;
  v_cancelled_30d int;
  v_active_30d_ago int;
  v_churn numeric;
begin
  if not is_platform_admin() then
    raise exception 'No autorizado';
  end if;

  select coalesce(sum(case when plan = 'monthly' then 149.99 else 1499.00 / 12.0 end), 0)
    into v_mrr
    from subscriptions where status = 'active';

  select count(*) into v_active_count from stores where subscription_status = 'active';
  select count(*) into v_trialing_count from stores where subscription_status = 'trialing';
  select count(*) into v_suspended_count from stores where subscription_status in ('suspended', 'past_due');

  select count(*) into v_cancelled_30d
    from stores where subscription_status = 'cancelled' and updated_at >= now() - interval '30 days';

  select count(*) into v_active_30d_ago
    from stores where created_at <= now() - interval '30 days'
      and subscription_status in ('active', 'past_due', 'cancelled', 'suspended');

  v_churn := case when v_active_30d_ago > 0 then round((v_cancelled_30d::numeric / v_active_30d_ago) * 100, 2) else 0 end;

  return jsonb_build_object(
    'mrr', v_mrr,
    'arr', v_mrr * 12,
    'active_stores', v_active_count,
    'trialing_stores', v_trialing_count,
    'suspended_stores', v_suspended_count,
    'churn_30d_pct', v_churn
  );
end;
$$;

create function list_platform_tenants() returns table(
  store_id uuid,
  name text,
  business_type store_business_type,
  subscription_status subscription_status,
  plan subscription_plan,
  current_period_end timestamptz,
  owner_email text,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_platform_admin() then
    raise exception 'No autorizado';
  end if;

  return query
    select s.id, s.name, s.business_type, s.subscription_status, s.plan,
           sub.current_period_end, u.email::text, s.created_at
    from stores s
    left join subscriptions sub on sub.store_id = s.id
    left join store_members sm on sm.store_id = s.id and sm.role = 'owner'
    left join auth.users u on u.id = sm.user_id
    order by s.created_at desc;
end;
$$;

-- Suspender/reactivar manualmente (casos excepcionales, PRD 5.J). No
-- toca Mercado Pago — es una anulación operativa del operador del SaaS,
-- independiente del ciclo de cobro.
create function platform_set_store_status(p_store_id uuid, p_status subscription_status) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then
    raise exception 'No autorizado';
  end if;

  update stores set subscription_status = p_status, updated_at = now() where id = p_store_id;
  update subscriptions set status = p_status, updated_at = now() where store_id = p_store_id;
end;
$$;
