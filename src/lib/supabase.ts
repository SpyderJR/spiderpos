import { createClient } from '@supabase/supabase-js'
import { env } from './env'

/**
 * Cliente Supabase del navegador. Usa únicamente la anon key — jamás el
 * service_role, que vive exclusivamente en las Edge Functions.
 */
export const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
