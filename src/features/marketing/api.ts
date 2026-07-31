import { z } from 'zod'
import { env } from '../../lib/env'

const checkoutResponseSchema = z.object({
  signup_id: z.uuid(),
  checkout_url: z.url(),
})

export interface CreateCheckoutInput {
  business_name: string
  business_type: 'abarrotes' | 'papeleria' | 'farmacia' | 'ferreteria'
  owner_full_name: string
  owner_email: string
  plan: 'monthly' | 'annual'
}

export async function createCheckout(input: CreateCheckoutInput) {
  const response = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      ...input,
      return_base_url: `${window.location.origin}/checkout/return`,
    }),
  })

  const body: unknown = await response.json()
  if (!response.ok) {
    const message =
      typeof body === 'object' && body && 'error' in body
        ? String(body.error)
        : 'No se pudo iniciar el registro'
    throw new Error(message)
  }
  return checkoutResponseSchema.parse(body)
}

const signupStatusSchema = z.object({
  status: z.enum(['pending', 'provisioned', 'expired']),
  email: z.email().optional(),
  token_hash: z.string().optional(),
})

export async function checkSignupStatus(signupId: string) {
  const response = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/check-signup-status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ signup_id: signupId }),
  })
  const body: unknown = await response.json()
  if (!response.ok) throw new Error('No se pudo verificar el estado del registro')
  return signupStatusSchema.parse(body)
}
