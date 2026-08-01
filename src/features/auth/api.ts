import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { env } from '../../lib/env'

export async function signInOwner(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export interface ActiveStaffMember {
  id: string
  full_name: string
  role: 'owner' | 'manager' | 'cashier'
}

/** Solo nombre + rol, sin sesión — mismo nivel de exposición que un
 * gafete físico, usado para el selector de avatar antes del PIN. */
export async function listActiveStaff(storeId: string): Promise<ActiveStaffMember[]> {
  const { data, error } = await supabase.rpc('list_active_staff', { p_store_id: storeId })
  if (error) throw error
  return data
}

const pinLoginResponseSchema = z.object({
  email: z.email(),
  token_hash: z.string(),
  full_name: z.string().nullable(),
})

const pinLoginErrorSchema = z.object({
  error: z.string(),
  locked_until: z.string().optional(),
})

export async function pinLogin(storeId: string, pin: string) {
  const response = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/pin-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ store_id: storeId, pin }),
  })

  const body: unknown = await response.json()

  if (!response.ok) {
    const parsedError = pinLoginErrorSchema.safeParse(body)
    throw new Error(parsedError.success ? parsedError.data.error : 'No se pudo iniciar sesión')
  }

  const parsed = pinLoginResponseSchema.parse(body)

  const { error } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: parsed.token_hash,
  })
  if (error) throw error

  return parsed
}
