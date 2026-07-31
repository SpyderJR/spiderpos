import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState {
  session: Session | null
  initialized: boolean
}

export const useAuthStore = create<AuthState>(() => ({
  session: null,
  initialized: false,
}))

let bootstrapped = false

/** Se llama una sola vez desde main.tsx. Mantiene el store sincronizado
 * con el estado real de Supabase Auth (login, logout, refresh de token). */
export function bootstrapAuth(): void {
  if (bootstrapped) return
  bootstrapped = true

  supabase.auth.getSession().then(({ data }) => {
    useAuthStore.setState({ session: data.session, initialized: true })
  })

  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.setState({ session, initialized: true })
  })
}
