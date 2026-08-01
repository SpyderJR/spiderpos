-- =========================================================================
-- El índice único original bloqueaba reintentar una factura después de un
-- error (status='error' contaba como "vigente" igual que 'stamped'). Solo
-- debe haber una factura VIGENTE (timbrada y no cancelada) por venta —
-- los errores no cuentan.
-- =========================================================================

drop index if exists idx_invoices_sale_active;
create unique index idx_invoices_sale_active on invoices(sale_id) where status = 'stamped';
