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

interface NewCredentials {
  business_name: string
  owner_email: string
  temp_password: string
}

export function AdminCashRequestsPage() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [newCredentials, setNewCredentials] = useState<NewCredentials | null>(null)
  const requestsQuery = useQuery({
    queryKey: ['cash-signup-requests'],
    queryFn: fetchCashSignupRequests,
  })

  const provisionMutation = useMutation({
    mutationFn: provisionCashTenant,
    onSuccess: (result, requestId) => {
      setError(null)
      const request = requestsQuery.data?.find((r) => r.id === requestId)
      setNewCredentials({
        business_name: request?.business_name ?? 'la tienda',
        owner_email: result.owner_email,
        temp_password: result.temp_password,
      })
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

      {newCredentials && (
        <div className="rounded-xl border border-emerald-800 bg-emerald-950/30 p-4">
          <div className="mb-2 flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-emerald-300">
              ✅ {newCredentials.business_name} ya está activa — pásale estos datos a tu cliente por
              WhatsApp o en persona (no se van a volver a mostrar):
            </p>
            <button
              type="button"
              onClick={() => setNewCredentials(null)}
              className="shrink-0 text-xs text-emerald-400 hover:underline"
            >
              Cerrar
            </button>
          </div>
          <div className="bg-carbon-950 flex flex-col gap-1 rounded-lg p-3 font-mono text-sm">
            <p className="text-paper">
              Usuario: <span className="text-emerald-300">{newCredentials.owner_email}</span>
            </p>
            <p className="text-paper">
              Contraseña: <span className="text-emerald-300">{newCredentials.temp_password}</span>
            </p>
          </div>
          <p className="text-carbon-400 mt-2 text-xs">
            Entra en spiderpos.netlify.app → "Ya tengo cuenta" con esos datos.
          </p>
        </div>
      )}

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
