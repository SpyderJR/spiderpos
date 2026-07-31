import { z } from 'zod'
import { env } from '../../lib/env'
import { supabase } from '../../lib/supabase'

const demoLoginResponseSchema = z.object({
  email: z.email(),
  token_hash: z.string(),
})

export async function enterDemo(email?: string): Promise<void> {
  const response = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/demo-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(email ? { email } : {}),
  })

  const body: unknown = await response.json()
  if (!response.ok) {
    const message =
      typeof body === 'object' && body && 'error' in body
        ? String(body.error)
        : 'No se pudo entrar al modo demo'
    throw new Error(message)
  }

  const parsed = demoLoginResponseSchema.parse(body)
  const { error } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: parsed.token_hash,
  })
  if (error) throw error
}
