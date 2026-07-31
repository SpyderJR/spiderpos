import { z } from 'zod'
import { supabase } from '../../lib/supabase'

const metricsSchema = z.object({
  mrr: z.number(),
  arr: z.number(),
  active_stores: z.number(),
  trialing_stores: z.number(),
  suspended_stores: z.number(),
  churn_30d_pct: z.number(),
})

export async function fetchPlatformMetrics() {
  const { data, error } = await supabase.rpc('get_platform_metrics')
  if (error) throw error
  return metricsSchema.parse(data)
}

export async function fetchPlatformTenants() {
  const { data, error } = await supabase.rpc('list_platform_tenants')
  if (error) throw error
  return data
}

export async function setTenantStatus(
  storeId: string,
  status: 'active' | 'suspended' | 'trialing' | 'cancelled',
) {
  const { error } = await supabase.rpc('platform_set_store_status', {
    p_store_id: storeId,
    p_status: status,
  })
  if (error) throw error
}

export async function isPlatformAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_platform_admin')
  if (error) throw error
  return data ?? false
}
