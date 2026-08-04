import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchPlatformTenants, setTenantStatus, renewCashSubscription } from './api'

const STATUS_LABELS: Record<string, string> = {
  trialing: 'En prueba',
  active: 'Activa',
  past_due: 'Pago pendiente',
  suspended: 'Suspendida',
  cancelled: 'Cancelada',
}

const STATUS_COLORS: Record<string, string> = {
  trialing: 'bg-amber-950/40 text-amber-400',
  active: 'bg-emerald-950/40 text-emerald-400',
  past_due: 'bg-amber-950/40 text-amber-400',
  suspended: 'bg-red-950/40 text-red-400',
  cancelled: 'bg-red-950/40 text-red-400',
}

function daysUntil(dateStr: string): number {
  const ms = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

export function AdminTenantsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const tenantsQuery = useQuery({ queryKey: ['platform-tenants'], queryFn: fetchPlatformTenants })

  const mutation = useMutation({
    mutationFn: ({ storeId, status }: { storeId: string; status: 'active' | 'suspended' }) =>
      setTenantStatus(storeId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform-tenants'] }),
  })

  const renewMutation = useMutation({
    mutationFn: renewCashSubscription,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform-tenants'] }),
  })

  const filtered = tenantsQuery.data?.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-paper text-xl font-bold">Tiendas</h1>

      <input
        placeholder="Buscar tienda..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border-carbon-700 bg-carbon-900 text-paper placeholder:text-carbon-500 rounded-xl border px-4 py-2.5 text-sm"
      />

      {tenantsQuery.isLoading && <p className="text-carbon-400 text-sm">Cargando...</p>}

      <div className="flex flex-col gap-2">
        {filtered?.map((t) => (
          <div
            key={t.store_id}
            className="border-carbon-800 bg-carbon-900 flex items-center justify-between rounded-xl border p-4"
          >
            <div>
              <p className="text-paper font-medium">
                {t.provider === 'cash' ? '💵' : t.provider ? '💳' : '⚪'} {t.name}
              </p>
              <p className="text-carbon-400 text-xs">
                {t.owner_email ?? 'sin dueño'} · {t.plan ?? 'sin plan'} ·{' '}
                {new Date(t.created_at).toLocaleDateString('es-MX')}
              </p>
              {t.provider === 'cash' && t.current_period_end && (
                <p
                  className={`text-xs ${daysUntil(t.current_period_end) < 0 ? 'text-red-400' : daysUntil(t.current_period_end) <= 5 ? 'text-amber-400' : 'text-carbon-500'}`}
                >
                  {daysUntil(t.current_period_end) < 0
                    ? `Venció hace ${Math.abs(daysUntil(t.current_period_end))} día(s)`
                    : `Vence en ${daysUntil(t.current_period_end)} día(s)`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[t.subscription_status] ?? ''}`}
              >
                {STATUS_LABELS[t.subscription_status] ?? t.subscription_status}
              </span>
              {t.provider === 'cash' && (
                <button
                  type="button"
                  disabled={renewMutation.isPending}
                  onClick={() => renewMutation.mutate(t.store_id)}
                  className="text-brand-400 text-xs font-medium hover:underline disabled:opacity-60"
                >
                  Registrar renovación
                </button>
              )}
              {t.subscription_status === 'suspended' ? (
                <button
                  type="button"
                  onClick={() => mutation.mutate({ storeId: t.store_id, status: 'active' })}
                  className="text-brand-400 text-xs font-medium hover:underline"
                >
                  Reactivar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => mutation.mutate({ storeId: t.store_id, status: 'suspended' })}
                  className="text-xs font-medium text-red-400 hover:underline"
                >
                  Suspender
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
