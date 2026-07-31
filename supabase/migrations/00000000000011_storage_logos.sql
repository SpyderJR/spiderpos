-- =========================================================================
-- Fase 2 — Bucket de Storage para logos de tienda, aislado por store_id
-- (PRD 2.2, 5.A). Convención de ruta: {store_id}/logo.<ext>
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('store-logos', 'store-logos', true)
on conflict (id) do nothing;

-- Lectura pública (el logo se imprime en tickets/PDF y se muestra en login,
-- que ocurre antes de tener sesión) pero la escritura queda aislada por
-- tienda: solo un miembro de la tienda puede subir/editar/borrar el archivo
-- cuyo primer segmento de ruta coincide con su store_id.
create policy store_logos_public_read on storage.objects
  for select using (bucket_id = 'store-logos');

create policy store_logos_tenant_write on storage.objects
  for insert with check (
    bucket_id = 'store-logos'
    and (storage.foldername(name))[1] = auth_store_id()::text
    and auth_role() = 'owner'
  );

create policy store_logos_tenant_update on storage.objects
  for update
  using (
    bucket_id = 'store-logos'
    and (storage.foldername(name))[1] = auth_store_id()::text
    and auth_role() = 'owner'
  )
  with check (
    bucket_id = 'store-logos'
    and (storage.foldername(name))[1] = auth_store_id()::text
    and auth_role() = 'owner'
  );

create policy store_logos_tenant_delete on storage.objects
  for delete using (
    bucket_id = 'store-logos'
    and (storage.foldername(name))[1] = auth_store_id()::text
    and auth_role() = 'owner'
  );
