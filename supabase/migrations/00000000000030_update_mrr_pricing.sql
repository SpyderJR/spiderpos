-- =========================================================================
-- El plan mensual subió de $149.99 a $299 MXN — actualiza el cálculo de MRR
-- del panel súper admin para que refleje el precio real (create or replace,
-- las migraciones ya aplicadas no se editan). Resto de la función sin
-- cambios respecto a 00000000000022_saas_subscriptions.sql.
-- =========================================================================

create or replace function get_platform_metrics() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_mrr numeric;
  v_active_count int;
  v_trialing_count int;
  v_suspended_count int;
  v_cancelled_30d int;
  v_active_30d_ago int;
  v_churn numeric;
begin
  if not is_platform_admin() then
    raise exception 'No autorizado';
  end if;

  select coalesce(sum(case when plan = 'monthly' then 299.00 else 1499.00 / 12.0 end), 0)
    into v_mrr
    from subscriptions where status = 'active';

  select count(*) into v_active_count from stores where subscription_status = 'active';
  select count(*) into v_trialing_count from stores where subscription_status = 'trialing';
  select count(*) into v_suspended_count from stores where subscription_status in ('suspended', 'past_due');

  select count(*) into v_cancelled_30d
    from stores where subscription_status = 'cancelled' and updated_at >= now() - interval '30 days';

  select count(*) into v_active_30d_ago
    from stores where created_at <= now() - interval '30 days'
      and subscription_status in ('active', 'past_due', 'cancelled', 'suspended');

  v_churn := case when v_active_30d_ago > 0 then round((v_cancelled_30d::numeric / v_active_30d_ago) * 100, 2) else 0 end;

  return jsonb_build_object(
    'mrr', v_mrr,
    'arr', v_mrr * 12,
    'active_stores', v_active_count,
    'trialing_stores', v_trialing_count,
    'suspended_stores', v_suspended_count,
    'churn_30d_pct', v_churn
  );
end;
$$;
