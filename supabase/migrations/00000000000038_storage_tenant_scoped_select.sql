-- =========================================================================
-- Corrige una regresión de la migración anterior (00000000000037): quitar
-- por completo la política de SELECT en storage.objects rompió la subida
-- de fotos — Supabase Storage necesita poder consultar (SELECT) el objeto
-- bajo RLS como parte del propio flujo de upload/upsert, no solo del lado
-- del cliente. "new row violates row-level security policy" al guardar
-- un producto con foto era este problema.
--
-- La corrección correcta no es volver a la política pública amplia (eso es
-- justo lo que el Security Advisor marcaba: cualquiera podía listar todos
-- los archivos de todas las tiendas). En vez de eso, la política de
-- lectura queda acotada a la propia carpeta de la tienda — igual que ya
-- están las de insert/update/delete. La descarga pública por URL directa
-- no se ve afectada (eso lo permite el bucket público, no esta política).
-- =========================================================================

create policy product_images_tenant_read on storage.objects
  for select using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth_store_id()::text
  );

create policy store_logos_tenant_read on storage.objects
  for select using (
    bucket_id = 'store-logos'
    and (storage.foldername(name))[1] = auth_store_id()::text
  );
