-- =========================================================================
-- Fase 8 — Corrección de raíz: los PIN se hasheaban con bcryptjs (JS,
-- formato $2b$) en el cliente/Edge Functions, pero se verificaban con
-- crypt() de pgcrypto en Postgres para el flujo de supervisor. Se
-- comprobó (con un hash bcryptjs conocido + PIN correcto) que crypt()
-- de esta instancia NO verifica hashes $2b$ generados por bcryptjs — la
-- verificación de PIN de supervisor fallaba siempre, con cualquier PIN.
--
-- Solución: unificar TODO el hasheo/verificación de PIN dentro de
-- Postgres (crypt() + gen_salt('bf')), para que hash y verificación
-- usen siempre la misma implementación. hash_pin() se llama al crear/
-- resetear un PIN; find_member_by_pin() reemplaza el loop manual de
-- bcryptjs.compare() en la Edge Function pin-login.
-- =========================================================================

create function hash_pin(p_pin text) returns text
language sql volatile set search_path = public, extensions as $$
  select crypt(p_pin, gen_salt('bf'));
$$;

create function find_member_by_pin(p_store_id uuid, p_pin text)
returns table(member_id uuid, user_id uuid, full_name text)
language sql stable security definer set search_path = public, extensions as $$
  select id, store_members.user_id, store_members.full_name
  from store_members
  where store_id = p_store_id
    and active = true
    and pin_hash is not null
    and pin_hash = crypt(p_pin, pin_hash)
  limit 1;
$$;
