-- =========================================================================
-- Rediseño — Selector de avatar de empleado en la pantalla de PIN. Se
-- llama ANTES de autenticarse (mismo momento que pin-login), así que
-- necesita ser accesible sin sesión. Expone solo nombre + rol — nunca
-- pin_hash, email ni permisos — el mismo nivel de exposición que un
-- gafete físico en el mostrador.
-- =========================================================================

create function list_active_staff(p_store_id uuid)
returns table(id uuid, full_name text, role store_role)
language sql stable security definer set search_path = public as $$
  select id, full_name, role
  from store_members
  where store_id = p_store_id and active = true
  order by full_name;
$$;

grant execute on function list_active_staff(uuid) to anon;
