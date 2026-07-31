import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { supabase } from '../../lib/supabase'
import { checkSignupStatus } from './api'

const POLL_INTERVAL_MS = 1500
const MAX_ATTEMPTS = 40 // ~60s

export function CheckoutReturnPage() {
  const [searchParams] = useSearchParams()
  const signupId = searchParams.get('signup_id')
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(
    signupId ? null : 'Falta información del registro. Intenta de nuevo desde el enlace de pago.',
  )

  useEffect(() => {
    if (!signupId) return

    let cancelled = false
    let attempts = 0

    async function poll() {
      if (cancelled) return
      attempts += 1
      try {
        const result = await checkSignupStatus(signupId!)
        if (result.status === 'provisioned' && result.token_hash && result.email) {
          const { error: otpError } = await supabase.auth.verifyOtp({
            type: 'magiclink',
            token_hash: result.token_hash,
          })
          if (otpError) {
            if (!cancelled)
              setError(
                'Tu pago se procesó, pero no pudimos iniciar tu sesión automáticamente. Inicia sesión manualmente.',
              )
            return
          }
          if (!cancelled) navigate('/backoffice', { replace: true })
          return
        }
      } catch {
        // sigue intentando
      }

      if (attempts >= MAX_ATTEMPTS) {
        if (!cancelled) {
          setError(
            'Tu pago está siendo confirmado por Mercado Pago. Esto puede tardar unos minutos — revisa tu correo o intenta iniciar sesión en breve.',
          )
        }
        return
      }
      setTimeout(poll, POLL_INTERVAL_MS)
    }

    poll()
    return () => {
      cancelled = true
    }
  }, [signupId, navigate])

  return (
    <div className="from-carbon-950 via-carbon-900 to-brand-900 flex min-h-dvh flex-col items-center justify-center gap-6 bg-gradient-to-br px-4 text-center">
      <Logo className="h-16 w-16" />
      {error ? (
        <div className="flex flex-col items-center gap-3">
          <p className="max-w-sm text-sm text-white/90">{error}</p>
          <a href="/login" className="text-brand-300 text-sm font-medium hover:underline">
            Ir a iniciar sesión
          </a>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <span
            className="h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white"
            aria-label="Cargando"
          />
          <p className="text-sm text-white/90">Confirmando tu pago y preparando tu tienda...</p>
        </div>
      )}
    </div>
  )
}
