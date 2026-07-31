-- =========================================================================
-- Fase 11 (pulido) — Modo demo público: un tendero puede probar SpiderPOS
-- completo sin pagar ni crear cuenta real. Es una tienda REAL compartida
-- (no un sandbox aislado por visitante — eso requeriría re-provisionar un
-- tenant completo por sesión, fuera de alcance para un "pruébalo en 30s");
-- se resetea todos los días vía pg_cron para que nunca acumule basura ni
-- datos de otros tenderos probando al mismo tiempo.
-- =========================================================================

alter table stores add column is_demo boolean not null default false;

-- Captura de correo opcional al entrar al demo (lead real, no obligatorio).
create table demo_leads (
  id         uuid primary key default gen_random_uuid(),
  email      text,
  created_at timestamptz not null default now()
);

alter table demo_leads enable row level security;
-- Sin políticas: solo la Edge Function demo-login (service_role) escribe aquí.

-- Reinicia la tienda demo a un estado limpio: borra la tienda (cascada a
-- ventas, clientes, cortes, etc. — todo store_id referencia stores con
-- on delete cascade) y la vuelve a crear idéntica, con el mismo id y el
-- mismo dueño, con catálogo semilla fresco.
create function reset_demo_store(p_store_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_name text;
  v_business_type store_business_type;
  v_owner_user_id uuid;
  v_owner_full_name text;
begin
  select name, business_type into v_name, v_business_type from stores where id = p_store_id and is_demo = true;
  if v_name is null then
    raise exception 'store % no existe o no es una tienda demo', p_store_id;
  end if;

  select user_id, full_name into v_owner_user_id, v_owner_full_name
    from store_members where store_id = p_store_id and role = 'owner' limit 1;

  delete from stores where id = p_store_id;

  insert into stores (id, name, business_type, is_demo, subscription_status)
    values (p_store_id, v_name, v_business_type, true, 'active');

  if v_owner_user_id is not null then
    insert into store_members (user_id, store_id, role, full_name, active)
      values (v_owner_user_id, p_store_id, 'owner', coalesce(v_owner_full_name, 'Demo'), true);
  end if;

  perform seed_store_catalog(p_store_id);
end;
$$;

-- Reinicio diario automático (6am UTC) de TODAS las tiendas demo, vía
-- pg_cron (ya habilitado en proyectos Supabase). Si no hay ninguna tienda
-- demo todavía, el job simplemente no hace nada.
create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'reset-demo-stores-daily',
  '0 6 * * *',
  $$ select reset_demo_store(id) from stores where is_demo = true; $$
);
