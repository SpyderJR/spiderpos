-- =========================================================================
-- El bucket ya es público (public = true), así que cualquiera puede
-- descargar un archivo por su URL sin pasar por RLS — eso es lo que
-- queremos para fotos de producto y logos. Pero además dejamos una
-- política de SELECT amplia sobre storage.objects que permite *listar*
-- (enumerar nombres de archivo) todo el bucket, algo que no se necesita
-- para servir imágenes por URL directa. La quitamos; el acceso público
-- por URL sigue funcionando igual.
-- =========================================================================

drop policy if exists product_images_public_read on storage.objects;
drop policy if exists store_logos_public_read on storage.objects;
