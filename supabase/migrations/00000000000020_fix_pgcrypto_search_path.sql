-- =========================================================================
-- Fase 8 — Corrección: en Supabase, pgcrypto se instala en el esquema
-- `extensions`, no en `public`. verify_supervisor_pin() declaraba
-- `search_path = public` y crypt() no resolvía ("function crypt(text, text)
-- does not exist"), bloqueando por completo la cancelación de ventas y
-- cualquier flujo que dependa de PIN de supervisor. Se agrega `extensions`
-- al search_path.
-- =========================================================================

create or replace function verify_supervisor_pin(p_pin text) returns boolean
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_match boolean;
begin
  select exists (
    select 1 from store_members
    where store_id = auth_store_id()
      and role in ('owner', 'manager')
      and active = true
      and pin_hash is not null
      and pin_hash = crypt(p_pin, pin_hash)
  ) into v_match;
  return v_match;
end;
$$;
