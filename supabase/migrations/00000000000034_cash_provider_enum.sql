-- =========================================================================
-- Nuevo valor de subscription_provider para suscripciones pagadas en
-- efectivo. Separado en su propia migración porque Postgres no permite
-- usar un valor nuevo de enum en la misma transacción en la que se agrega.
-- =========================================================================

alter type subscription_provider add value 'cash';
