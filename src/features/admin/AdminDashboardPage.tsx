import { useQuery } from '@tanstack/react-query'
import { fetchPlatformMetrics } from './api'

const CARD_CLASS = 'rounded-2xl border border-carbon-800 bg-carbon-900 p-5 flex flex-col gap-1'

export function AdminDashboardPage() {
  const metricsQuery = useQuery({ queryKey: ['platform-metrics'], queryFn: fetchPlatformMetrics })
  const m = metricsQuery.data

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-paper text-xl font-bold">Dashboard de negocio</h1>

      {metricsQuery.isLoading && <p className="text-carbon-400 text-sm">Cargando métricas...</p>}
      {metricsQuery.isError && (
        <p className="text-sm text-red-400">No se pudieron cargar las métricas.</p>
      )}

      {m && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className={CARD_CLASS}>
            <span className="text-carbon-400 text-xs">MRR</span>
            <span className="text-paper text-2xl font-bold">
              ${m.mrr.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className={CARD_CLASS}>
            <span className="text-carbon-400 text-xs">ARR</span>
            <span className="text-paper text-2xl font-bold">
              ${m.arr.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className={CARD_CLASS}>
            <span className="text-carbon-400 text-xs">Churn (30 días)</span>
            <span className="text-paper text-2xl font-bold">{m.churn_30d_pct}%</span>
          </div>
          <div className={CARD_CLASS}>
            <span className="text-carbon-400 text-xs">Tiendas activas</span>
            <span className="text-2xl font-bold text-emerald-400">{m.active_stores}</span>
          </div>
          <div className={CARD_CLASS}>
            <span className="text-carbon-400 text-xs">En prueba</span>
            <span className="text-2xl font-bold text-amber-400">{m.trialing_stores}</span>
          </div>
          <div className={CARD_CLASS}>
            <span className="text-carbon-400 text-xs">Suspendidas</span>
            <span className="text-2xl font-bold text-red-400">{m.suspended_stores}</span>
          </div>
        </div>
      )}
    </div>
  )
}
