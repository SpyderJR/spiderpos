import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { env } from '../../lib/env'
import type { Database } from '../../lib/database/types'

type CashSignupRequest = Database['public']['Tables']['cash_signup_requests']['Row']

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

export async function renewCashSubscription(storeId: string) {
  const { error } = await supabase.rpc('platform_renew_cash_subscription', { p_store_id: storeId })
  if (error) throw error
}

export async function fetchCashSignupRequests(): Promise<CashSignupRequest[]> {
  const { data, error } = await supabase
    .from('cash_signup_requests')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function dismissCashSignupRequest(requestId: string) {
  const { error } = await supabase
    .from('cash_signup_requests')
    .update({ status: 'dismissed' })
    .eq('id', requestId)
  if (error) throw error
}

export async function provisionCashTenant(requestId: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('No autenticado')

  const response = await fetch(
    `${env.VITE_SUPABASE_URL}/functions/v1/admin-provision-cash-tenant`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ request_id: requestId }),
    },
  )
  const body: unknown = await response.json()
  if (!response.ok) {
    const message =
      typeof body === 'object' && body && 'error' in body
        ? String(body.error)
        : 'No se pudo dar de alta la tienda'
    throw new Error(message)
  }
}
