import { createClient } from '@supabase/supabase-js'
import { env } from './env'
import type { Database } from './database/types'

/**
 * Cliente Supabase del navegador. Usa únicamente la anon key — jamás el
 * service_role, que vive exclusivamente en las Edge Functions.
 */
export const supabase = createClient<Database>(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
