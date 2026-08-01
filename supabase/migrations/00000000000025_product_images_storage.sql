-- =========================================================================
-- Rediseño — Bucket de Storage para fotos de producto, aislado por
-- store_id (mismo patrón que store-logos). Convención de ruta:
-- {store_id}/{product_id}.<ext>
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy product_images_public_read on storage.objects
  for select using (bucket_id = 'product-images');

create policy product_images_tenant_write on storage.objects
  for insert with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth_store_id()::text
  );

create policy product_images_tenant_update on storage.objects
  for update
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth_store_id()::text)
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth_store_id()::text);

create policy product_images_tenant_delete on storage.objects
  for delete using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth_store_id()::text
  );
