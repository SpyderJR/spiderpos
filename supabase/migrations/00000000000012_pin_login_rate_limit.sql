-- =========================================================================
-- Fase 2 — Rate limiting del endpoint público de login por PIN (PRD 7:
-- "rate limiting en endpoints públicos"). Solo la Edge Function
-- pin-login (service_role) toca esta tabla; no lleva RLS de tenant normal
-- porque el propio login aún no tiene sesión — se bloquea con RLS estricto
-- de "nadie desde el cliente".
-- =========================================================================

create table pin_login_attempts (
  store_id      uuid primary key references stores(id) on delete cascade,
  attempts      integer not null default 0,
  locked_until  timestamptz,
  updated_at    timestamptz not null default now()
);

alter table pin_login_attempts enable row level security;
-- Sin políticas: RLS deniega todo acceso vía anon/authenticated. Solo la
-- Edge Function con service_role (que bypassa RLS) puede leer/escribir aquí.
