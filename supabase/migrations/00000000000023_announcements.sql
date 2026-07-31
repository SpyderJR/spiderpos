-- =========================================================================
-- Fase 10 — Centro de anuncios del SaaS (PRD 5.K). El resto del "centro de
-- notificaciones" (stock bajo, corte no realizado, pago próximo/fallido)
-- se computa en vivo desde tablas ya existentes (products, cash_shifts,
-- stores/subscriptions) — no necesita tabla propia.
-- =========================================================================

create table announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  created_at timestamptz not null default now()
);

alter table announcements enable row level security;

-- Cualquier miembro autenticado de cualquier tienda puede leer los
-- anuncios de la plataforma (no son datos de negocio de un tenant).
create policy authenticated_select on announcements
  for select using (auth.uid() is not null);

create policy platform_admin_insert on announcements
  for insert with check (is_platform_admin());

create policy platform_admin_delete on announcements
  for delete using (is_platform_admin());
