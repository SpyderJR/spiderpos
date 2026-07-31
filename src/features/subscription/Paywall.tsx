import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Logo } from '../../components/Logo'
import { Button } from '../../components/ui/Button'
import { signOut } from '../auth/api'
import { manageSubscription } from './api'
import type { Database } from '../../lib/database/types'

type SubscriptionStatus = Database['public']['Enums']['subscription_status']

const STATUS_MESSAGES: Record<string, string> = {
  past_due: 'Tu último cobro no se pudo procesar. Regulariza tu pago para seguir operando.',
  suspended: 'Tu suscripción está suspendida por falta de pago.',
  cancelled: 'Tu suscripción fue cancelada.',
}

interface PaywallProps {
  status: SubscriptionStatus
  canManage: boolean
}

export function Paywall({ status, canManage }: PaywallProps) {
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => manageSubscription('reactivate'),
    onSuccess: ({ checkout_url }) => {
      window.location.assign(checkout_url)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'No se pudo procesar el pago'),
  })

  return (
    <div className="from-carbon-950 via-carbon-900 to-brand-900 flex min-h-dvh flex-col items-center justify-center gap-6 bg-gradient-to-br px-4 text-center">
      <Logo className="h-16 w-16" />
      <div className="dark:bg-carbon-900 w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <h1 className="text-carbon-900 dark:text-paper text-lg font-bold">Pago pendiente</h1>
        <p className="text-carbon-500 dark:text-carbon-400 mt-2 text-sm">
          {STATUS_MESSAGES[status] ?? 'Tu suscripción no está activa.'}
        </p>
        <p className="text-carbon-400 mt-2 text-xs">
          Tus datos históricos están seguros — se conservan intactos mientras regularizas tu pago.
        </p>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {canManage ? (
          <Button
            onClick={() => {
              setError(null)
              mutation.mutate()
            }}
            loading={mutation.isPending}
            className="mt-6 w-full"
          >
            Regularizar pago ahora
          </Button>
        ) : (
          <p className="text-carbon-500 dark:text-carbon-400 mt-6 text-sm">
            Pide al dueño de la tienda que regularice el pago para continuar.
          </p>
        )}
        <button
          type="button"
          onClick={() => signOut()}
          className="text-carbon-400 mt-4 text-xs hover:underline"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
