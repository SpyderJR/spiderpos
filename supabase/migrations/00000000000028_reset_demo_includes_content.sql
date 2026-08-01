-- =========================================================================
-- Rediseño — reset_demo_store() ahora también repuebla el contenido
-- demo (favoritos, clientes, promociones, historial de ventas) después
-- de sembrar el catálogo, para que el reinicio diario nunca vuelva a
-- dejar la tienda demo vacía.
-- =========================================================================

create or replace function reset_demo_store(p_store_id uuid) returns void
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
  perform seed_demo_content(p_store_id);
end;
$$;
