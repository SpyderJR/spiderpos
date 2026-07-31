import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useCurrentMember } from '../auth/useCurrentMember'
import { useThemeStore } from '../../store/useThemeStore'
import { Button } from '../../components/ui/Button'
import { fetchReportData } from './api'
import { exportSalesCsv } from './csvExport'
import { StatTile } from './StatTile'
import {
  CATEGORICAL_LIGHT,
  CATEGORICAL_DARK,
  SEQUENTIAL_LIGHT,
  SEQUENTIAL_DARK,
  CHART_INK_LIGHT,
  CHART_INK_DARK,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_ORDER,
} from './chartColors'

function formatMoney(value: unknown): string {
  return typeof value === 'number' ? `$${value.toFixed(2)}` : ''
}

function formatHourLabel(label: unknown): string {
  return typeof label === 'number' ? `${label}:00 hrs` : String(label ?? '')
}

function startOfDay(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
function endOfDay(date: Date): string {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

const PRESETS = [
  { key: 'today', label: 'Hoy' },
  { key: '7d', label: '7 días' },
  { key: '30d', label: '30 días' },
] as const

export function ReportsPage() {
  const { data: member } = useCurrentMember()
  const storeId = member?.store_id
  const storeName = member?.stores?.name ?? 'SpiderPOS'
  const theme = useThemeStore((s) => s.theme)
  const canViewMargin =
    member?.role === 'owner' ||
    member?.role === 'manager' ||
    !!(member?.permissions as Record<string, boolean>)?.view_profit_reports

  const [preset, setPreset] = useState<(typeof PRESETS)[number]['key']>('7d')

  const { from, to } = useMemo(() => {
    const now = new Date()
    const start = new Date(now)
    if (preset === '7d') start.setDate(now.getDate() - 6)
    if (preset === '30d') start.setDate(now.getDate() - 29)
    return { from: startOfDay(start), to: endOfDay(now) }
  }, [preset])

  const reportQuery = useQuery({
    queryKey: ['report', storeId, from, to],
    queryFn: () => fetchReportData({ storeId: storeId!, from, to }),
    enabled: !!storeId,
  })

  if (!storeId) return null

  const categorical = theme === 'dark' ? CATEGORICAL_DARK : CATEGORICAL_LIGHT
  const sequentialColor = theme === 'dark' ? SEQUENTIAL_DARK : SEQUENTIAL_LIGHT
  const ink = theme === 'dark' ? CHART_INK_DARK : CHART_INK_LIGHT
  const surface = theme === 'dark' ? '#1a1a19' : '#fcfcfb'

  const data = reportQuery.data
  const paymentData =
    data?.byPaymentMethod
      .slice()
      .sort(
        (a, b) => PAYMENT_METHOD_ORDER.indexOf(a.method) - PAYMENT_METHOD_ORDER.indexOf(b.method),
      )
      .map((p) => ({ ...p, label: PAYMENT_METHOD_LABELS[p.method] ?? p.method })) ?? []

  const hourData = data?.byHour.filter((h) => h.total > 0) ?? []

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-carbon-900 dark:text-paper text-2xl font-bold">Reportes</h1>
        <Button
          variant="secondary"
          disabled={!data}
          onClick={() => data && exportSalesCsv(data, storeName)}
        >
          Exportar CSV
        </Button>
      </div>

      <div className="flex gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPreset(p.key)}
            className={`min-h-11 rounded-xl px-4 text-sm font-medium ${
              preset === p.key
                ? 'bg-brand-600 text-white'
                : 'bg-carbon-100 text-carbon-700 dark:bg-carbon-800 dark:text-carbon-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {reportQuery.isLoading && <p className="text-carbon-500 dark:text-carbon-400">Cargando...</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Ventas totales" value={`$${data.totalSales.toFixed(2)}`} />
            <StatTile label="Tickets" value={String(data.saleCount)} />
            <StatTile label="Ticket promedio" value={`$${data.averageTicket.toFixed(2)}`} />
            {canViewMargin && (
              <StatTile
                label="Margen bruto"
                value={`$${data.grossMargin.toFixed(2)}`}
                hint="Solo visible para roles autorizados"
              />
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="border-carbon-200 dark:border-carbon-800 dark:bg-carbon-900 rounded-2xl border bg-white p-4">
              <h2 className="text-carbon-700 dark:text-carbon-300 mb-3 text-sm font-semibold">
                Ventas por forma de pago
              </h2>
              {paymentData.length === 0 ? (
                <p className="text-carbon-400 py-10 text-center text-sm">
                  Sin datos en este periodo.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={paymentData}
                      dataKey="amount"
                      nameKey="label"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {paymentData.map((entry, i) => (
                        <Cell
                          key={entry.method}
                          fill={categorical[i % categorical.length]}
                          stroke={surface}
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 12, color: ink.secondary }} />
                    <Tooltip
                      contentStyle={{
                        background: surface,
                        border: `1px solid ${ink.grid}`,
                        fontSize: 12,
                      }}
                      formatter={formatMoney}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="border-carbon-200 dark:border-carbon-800 dark:bg-carbon-900 rounded-2xl border bg-white p-4">
              <h2 className="text-carbon-700 dark:text-carbon-300 mb-3 text-sm font-semibold">
                Productos más vendidos
              </h2>
              {data.topProducts.length === 0 ? (
                <p className="text-carbon-400 py-10 text-center text-sm">
                  Sin datos en este periodo.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.topProducts} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid horizontal={false} stroke={ink.grid} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: ink.muted }}
                      axisLine={{ stroke: ink.grid }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={{ fontSize: 11, fill: ink.secondary }}
                      axisLine={{ stroke: ink.grid }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: surface,
                        border: `1px solid ${ink.grid}`,
                        fontSize: 12,
                      }}
                      formatter={formatMoney}
                    />
                    <Bar
                      dataKey="total"
                      fill={sequentialColor}
                      radius={[0, 4, 4, 0]}
                      maxBarSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="border-carbon-200 dark:border-carbon-800 dark:bg-carbon-900 rounded-2xl border bg-white p-4">
              <h2 className="text-carbon-700 dark:text-carbon-300 mb-3 text-sm font-semibold">
                Horas pico
              </h2>
              {hourData.length === 0 ? (
                <p className="text-carbon-400 py-10 text-center text-sm">
                  Sin datos en este periodo.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={hourData}>
                    <CartesianGrid vertical={false} stroke={ink.grid} />
                    <XAxis
                      dataKey="hour"
                      tickFormatter={(h: number) => `${h}h`}
                      tick={{ fontSize: 11, fill: ink.muted }}
                      axisLine={{ stroke: ink.grid }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: ink.muted }}
                      axisLine={{ stroke: ink.grid }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: surface,
                        border: `1px solid ${ink.grid}`,
                        fontSize: 12,
                      }}
                      formatter={formatMoney}
                      labelFormatter={formatHourLabel}
                    />
                    <Bar
                      dataKey="total"
                      fill={sequentialColor}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="border-carbon-200 dark:border-carbon-800 dark:bg-carbon-900 rounded-2xl border bg-white p-4">
              <h2 className="text-carbon-700 dark:text-carbon-300 mb-3 text-sm font-semibold">
                Ventas por empleado
              </h2>
              {data.byEmployee.length === 0 ? (
                <p className="text-carbon-400 py-10 text-center text-sm">
                  Sin datos en este periodo.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.byEmployee} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid horizontal={false} stroke={ink.grid} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: ink.muted }}
                      axisLine={{ stroke: ink.grid }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={90}
                      tick={{ fontSize: 11, fill: ink.secondary }}
                      axisLine={{ stroke: ink.grid }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: surface,
                        border: `1px solid ${ink.grid}`,
                        fontSize: 12,
                      }}
                      formatter={formatMoney}
                    />
                    <Bar
                      dataKey="total"
                      fill={sequentialColor}
                      radius={[0, 4, 4, 0]}
                      maxBarSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
