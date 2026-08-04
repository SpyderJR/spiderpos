-- =========================================================================
-- Suscripciones pagadas en efectivo — para tenderos que no tienen tarjeta o
-- les da desconfianza usarla en línea (caso real: negocios rurales). No hay
-- forma de "cobrar solo" en efectivo cada mes, así que este flujo es
-- deliberadamente manual: el prospecto deja sus datos desde la landing
-- (cash_signup_requests), el súper admin lo contacta, cobra por fuera
-- (efectivo/transferencia directa) y da de alta la tienda desde el panel.
-- Las renovaciones futuras se registran igual, a mano, extendiendo
-- current_period_end — por eso subscription_status ya bloquea el acceso
-- solo (ProtectedRoute) si el admin no renueva a tiempo, sin código nuevo.
-- =========================================================================

create type cash_signup_status as enum ('pending', 'provisioned', 'dismissed');

create table cash_signup_requests (
  id              uuid primary key default gen_random_uuid(),
  business_name   text not null,
  business_type   store_business_type not null,
  owner_full_name text not null,
  owner_email     text not null,
  owner_phone     text not null,
  plan            subscription_plan not null,
  status          cash_signup_status not null default 'pending',
  store_id        uuid references stores(id) on delete set null,
  created_at      timestamptz not null default now(),
  provisioned_at  timestamptz
);

alter table cash_signup_requests enable row level security;

-- Sin política de insert: la crea request-cash-signup con service_role
-- (público, sin auth, igual que create-checkout con pending_signups).
create policy platform_admin_select on cash_signup_requests
  for select using (is_platform_admin());
create policy platform_admin_update on cash_signup_requests
  for update using (is_platform_admin());

-- ---------------------------------------------------------------------
-- Extiende list_platform_tenants con el método de pago — el súper admin
-- necesita distinguir "efectivo" (requiere seguimiento manual) de
-- "mercadopago" (se renueva solo) para saber a quién recordarle.
-- ---------------------------------------------------------------------
-- create or replace no permite cambiar las columnas de un "returns table"
-- (agregamos "provider") — hay que soltarla primero.
drop function list_platform_tenants();

create function list_platform_tenants() returns table(
  store_id uuid,
  name text,
  business_type store_business_type,
  subscription_status subscription_status,
  plan subscription_plan,
  provider subscription_provider,
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
           sub.provider, sub.current_period_end, u.email::text, s.created_at
    from stores s
    left join subscriptions sub on sub.store_id = s.id
    left join store_members sm on sm.store_id = s.id and sm.role = 'owner'
    left join auth.users u on u.id = sm.user_id
    order by s.created_at desc;
end;
$$;

-- ---------------------------------------------------------------------
-- Registrar una renovación en efectivo: extiende current_period_end un
-- periodo del plan (desde hoy, o desde el vencimiento actual si todavía
-- no vence — para no "perder" días si renuevan antes de tiempo) y
-- reactiva la tienda si estaba suspendida.
-- ---------------------------------------------------------------------
create function platform_renew_cash_subscription(p_store_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_plan subscription_plan;
  v_current_end timestamptz;
  v_base timestamptz;
begin
  if not is_platform_admin() then
    raise exception 'No autorizado';
  end if;

  select plan, current_period_end into v_plan, v_current_end
    from subscriptions where store_id = p_store_id and provider = 'cash';
  if v_plan is null then
    raise exception 'Esta tienda no tiene una suscripción en efectivo';
  end if;

  v_base := greatest(coalesce(v_current_end, now()), now());

  update subscriptions
    set current_period_end = v_base + case when v_plan = 'annual' then interval '12 months' else interval '1 month' end,
        status = 'active',
        updated_at = now()
    where store_id = p_store_id and provider = 'cash';

  update stores set subscription_status = 'active', updated_at = now() where id = p_store_id;
end;
$$;
