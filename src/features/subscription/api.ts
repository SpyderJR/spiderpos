import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { env } from '../../lib/env'
import type { Database } from '../../lib/database/types'

type Subscription = Database['public']['Tables']['subscriptions']['Row']
type SubscriptionPayment = Database['public']['Tables']['subscription_payments']['Row']

export async function fetchSubscription(storeId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('store_id', storeId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function fetchPaymentHistory(storeId: string): Promise<SubscriptionPayment[]> {
  const { data, error } = await supabase
    .from('subscription_payments')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

const manageResponseSchema = z.object({ checkout_url: z.url() })

export async function manageSubscription(
  action: 'reactivate' | 'upgrade',
  newPlan?: 'monthly' | 'annual',
) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('No autenticado')

  const response = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/manage-subscription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      action,
      new_plan: newPlan,
      return_url: `${window.location.origin}/backoffice/suscripcion`,
    }),
  })

  const body: unknown = await response.json()
  if (!response.ok) {
    const message =
      typeof body === 'object' && body && 'error' in body
        ? String(body.error)
        : 'No se pudo procesar la solicitud'
    throw new Error(message)
  }
  return manageResponseSchema.parse(body)
}
