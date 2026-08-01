import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useCurrentMember } from '../auth/useCurrentMember'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge, type BadgeTone } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { Skeleton } from '../../components/ui/Skeleton'
import { fetchSubscription, fetchPaymentHistory, manageSubscription } from './api'

const STATUS_LABELS: Record<string, string> = {
  trialing: 'En prueba',
  active: 'Activa',
  past_due: 'Pago pendiente',
  suspended: 'Suspendida',
  cancelled: 'Cancelada',
}

const STATUS_TONES: Record<string, BadgeTone> = {
  trialing: 'warning',
  active: 'success',
  past_due: 'warning',
  suspended: 'critical',
  cancelled: 'critical',
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  approved: 'Aprobado',
  rejected: 'Rechazado',
  pending: 'Pendiente',
  refunded: 'Reembolsado',
}

export function SubscriptionPage() {
  const { data: member } = useCurrentMember()
  const storeId = member?.store_id
  const [error, setError] = useState<string | null>(null)

  const subQuery = useQuery({
    queryKey: ['subscription', storeId],
    queryFn: () => fetchSubscription(storeId!),
    enabled: !!storeId,
  })

  const paymentsQuery = useQuery({
    queryKey: ['subscription-payments', storeId],
    queryFn: () => fetchPaymentHistory(storeId!),
    enabled: !!storeId,
  })

  const upgradeMutation = useMutation({
    mutationFn: () => manageSubscription('upgrade', 'annual'),
    onSuccess: ({ checkout_url }) => {
      window.location.assign(checkout_url)
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : 'No se pudo procesar la solicitud'),
  })

  if (member?.role !== 'owner') {
    return (
      <p className="text-carbon-500 dark:text-carbon-400 text-center">
        Solo el dueño de la tienda puede ver esta sección.
      </p>
    )
  }

  const sub = subQuery.data
  const canUpgrade = sub?.plan === 'monthly' && sub.status === 'active'

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-carbon-900 dark:text-paper text-2xl font-bold">Suscripción</h1>

      {subQuery.isLoading && <Skeleton className="h-28 w-full rounded-2xl" />}

      {sub && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-carbon-900 dark:text-paper font-semibold">
                Plan {sub.plan === 'monthly' ? 'Mensual Estándar' : 'Anual de Lanzamiento'}
              </p>
              {sub.current_period_end && (
                <p className="text-carbon-500 dark:text-carbon-400 text-sm">
                  Próximo cobro: {new Date(sub.current_period_end).toLocaleDateString('es-MX')}
                </p>
              )}
            </div>
            <Badge tone={STATUS_TONES[sub.status] ?? 'neutral'} dot>
              {STATUS_LABELS[sub.status] ?? sub.status}
            </Badge>
          </div>

          {error && (
            <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          {canUpgrade && (
            <Button
              variant="secondary"
              onClick={() => {
                setError(null)
                upgradeMutation.mutate()
              }}
              loading={upgradeMutation.isPending}
              className="mt-4 w-full"
            >
              Mejorar a plan anual (2 meses gratis)
            </Button>
          )}
        </Card>
      )}

      <h2 className="text-carbon-900 dark:text-paper mt-2 text-lg font-semibold">
        Historial de pagos
      </h2>
      {paymentsQuery.data?.length === 0 ? (
        <EmptyState icon="💳" title="Todavía no hay pagos registrados" />
      ) : (
        <ul className="flex flex-col gap-2">
          {paymentsQuery.data?.map((p) => (
            <Card key={p.id} className="flex items-center justify-between p-3">
              <div>
                <p className="text-carbon-900 dark:text-paper text-sm font-medium tabular-nums">
                  ${p.amount.toFixed(2)} MXN
                </p>
                <p className="text-carbon-400 text-xs">
                  {new Date(p.created_at).toLocaleString('es-MX')}
                </p>
              </div>
              <Badge tone={STATUS_TONES[p.status] ?? 'neutral'}>
                {PAYMENT_STATUS_LABELS[p.status] ?? p.status}
              </Badge>
            </Card>
          ))}
        </ul>
      )}
    </div>
  )
}
