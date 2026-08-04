import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchCashSignupRequests, provisionCashTenant, dismissCashSignupRequest } from './api'

const PLAN_LABELS: Record<string, string> = {
  monthly: '$299/mes',
  annual: '$2,990/año',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  provisioned: 'Ya dado de alta',
  dismissed: 'Descartada',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-950/40 text-amber-400',
  provisioned: 'bg-emerald-950/40 text-emerald-400',
  dismissed: 'bg-carbon-800 text-carbon-400',
}

export function AdminCashRequestsPage() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const requestsQuery = useQuery({
    queryKey: ['cash-signup-requests'],
    queryFn: fetchCashSignupRequests,
  })

  const provisionMutation = useMutation({
    mutationFn: provisionCashTenant,
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['cash-signup-requests'] })
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] })
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'No se pudo dar de alta'),
  })

  const dismissMutation = useMutation({
    mutationFn: dismissCashSignupRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cash-signup-requests'] }),
  })

  const pending = requestsQuery.data?.filter((r) => r.status === 'pending')
  const resolved = requestsQuery.data?.filter((r) => r.status !== 'pending')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-paper text-xl font-bold">Solicitudes de pago en efectivo</h1>
        <p className="text-carbon-400 text-sm">
          Contacta al prospecto, cobra por fuera de la app (efectivo, transferencia) y luego dale de
          alta aquí — su tienda queda activa al instante.
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {requestsQuery.isLoading && <p className="text-carbon-400 text-sm">Cargando...</p>}

      {pending?.length === 0 && (
        <p className="text-carbon-400 text-sm">No hay solicitudes pendientes.</p>
      )}

      <div className="flex flex-col gap-2">
        {pending?.map((r) => (
          <div
            key={r.id}
            className="border-carbon-800 bg-carbon-900 flex items-center justify-between rounded-xl border p-4"
          >
            <div>
              <p className="text-paper font-medium">{r.business_name}</p>
              <p className="text-carbon-400 text-xs">
                {r.owner_full_name} · {r.owner_email} · {r.owner_phone}
              </p>
              <p className="text-carbon-400 text-xs">
                {PLAN_LABELS[r.plan] ?? r.plan} ·{' '}
                {new Date(r.created_at).toLocaleDateString('es-MX')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => dismissMutation.mutate(r.id)}
                className="text-carbon-400 text-xs font-medium hover:underline"
              >
                Descartar
              </button>
              <button
                type="button"
                disabled={provisionMutation.isPending}
                onClick={() => provisionMutation.mutate(r.id)}
                className="bg-brand-600 hover:bg-brand-500 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                Ya me pagó — dar de alta
              </button>
            </div>
          </div>
        ))}
      </div>

      {resolved && resolved.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-carbon-400 text-sm font-semibold">Resueltas</h2>
          {resolved.map((r) => (
            <div
              key={r.id}
              className="border-carbon-800 bg-carbon-900 flex items-center justify-between rounded-xl border p-4"
            >
              <div>
                <p className="text-paper font-medium">{r.business_name}</p>
                <p className="text-carbon-400 text-xs">
                  {r.owner_full_name} · {r.owner_email}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[r.status]}`}
              >
                {STATUS_LABELS[r.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
