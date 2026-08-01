-- =========================================================================
-- Facturación electrónica CFDI 4.0 (PAC único: SpiderPOS timbra a nombre de
-- todas las tiendas vía Facturama — el tendero nunca contrata un PAC
-- aparte). Cada tienda sigue siendo el Emisor legal de sus propias
-- facturas: necesita su propio CSD (Certificado de Sello Digital) emitido
-- por el SAT, que se sube una sola vez y queda resguardado en un bucket
-- privado, aislado por store_id igual que el logo.
-- =========================================================================

-- Régimen fiscal (catálogo SAT c_RegimenFiscal) y código postal fiscal —
-- ambos exigidos por el CFDI 4.0 además de razón social y RFC, que ya
-- viven en tax_data desde la migración de perfil comercial.
alter table stores add column regimen_fiscal text;
alter table stores add column codigo_postal_fiscal text;

-- Se marca en true solo después de que register-issuer confirme con
-- Facturama que el CSD es válido y quedó dado de alta como emisor.
alter table stores add column facturama_issuer_ready boolean not null default false;

create table invoices (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references stores(id) on delete cascade,
  sale_id         uuid not null references sales(id) on delete restrict,
  issued_by       uuid references store_members(id) on delete set null,
  facturama_id    text,
  uuid_fiscal     text,
  customer_rfc    text not null,
  customer_name   text not null,
  customer_email  text,
  uso_cfdi        text not null,
  total           numeric(12,2) not null,
  status          text not null default 'stamped' check (status in ('stamped', 'error', 'cancelled')),
  error_message   text,
  created_at      timestamptz not null default now(),
  cancelled_at    timestamptz
);

-- Una sola factura viva (no cancelada) por venta — si se cancela, se puede
-- volver a facturar y queda el historial de ambos intentos.
create unique index idx_invoices_sale_active on invoices(sale_id) where status != 'cancelled';
create index idx_invoices_store on invoices(store_id);

alter table invoices enable row level security;

-- Solo lectura para el cliente — crear/cancelar factura siempre pasa por
-- las Edge Functions con service_role (nunca se exponen las credenciales
-- de Facturama al navegador).
create policy tenant_isolation_select on invoices for select using (store_id = auth_store_id());

-- ---------------------------------------------------------------------
-- Bucket privado para el CSD (.cer/.key) de cada tienda. Nunca público:
-- solo register-issuer (service_role) los lee para darlos de alta en
-- Facturama: una vez timbrado el emisor, los archivos ya no se vuelven a
-- necesitar, pero se conservan por si Facturama requiere reintentar.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('store-csd', 'store-csd', false)
on conflict (id) do nothing;

create policy "store_csd_owner_manage" on storage.objects for all
  using (bucket_id = 'store-csd' and (storage.foldername(name))[1] = auth_store_id()::text and auth_role() = 'owner')
  with check (bucket_id = 'store-csd' and (storage.foldername(name))[1] = auth_store_id()::text and auth_role() = 'owner');
