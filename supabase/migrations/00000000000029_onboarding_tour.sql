-- =========================================================================
-- Onboarding — bienvenida + tour guiado para dueños nuevos. Se guarda por
-- store_member (no por tienda) porque cada dueño real ve el tour una sola
-- vez en su vida. La tienda demo pública NUNCA usa esta columna — como
-- comparte una sola cuenta entre todos los visitantes, ese estado vive
-- solo en sessionStorage del navegador (ver useWelcomeTour.ts): si se
-- guardara aquí, el primer visitante del día "gastaría" el tour para
-- todos los que entren después hasta el próximo reinicio.
-- =========================================================================

alter table store_members add column tour_completed_at timestamptz;
