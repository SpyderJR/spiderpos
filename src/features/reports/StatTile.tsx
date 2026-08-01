import { Card } from '../../components/ui/Card'

interface StatTileProps {
  label: string
  value: string
  hint?: string
  trendPct?: number
}

export function StatTile({ label, value, hint, trendPct }: StatTileProps) {
  const hasTrend = typeof trendPct === 'number' && Number.isFinite(trendPct)
  const isUp = hasTrend && trendPct > 0
  const isFlat = hasTrend && trendPct === 0

  return (
    <Card className="p-4">
      <p className="text-carbon-500 dark:text-carbon-400 text-sm">{label}</p>
      <p className="text-carbon-900 dark:text-paper mt-1 text-2xl font-bold tabular-nums">
        {value}
      </p>
      {hasTrend && (
        <p
          className={`mt-0.5 text-xs font-semibold tabular-nums ${
            isFlat
              ? 'text-carbon-400'
              : isUp
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
          }`}
        >
          {isFlat ? '→' : isUp ? '↑' : '↓'} {Math.abs(trendPct).toFixed(0)}% vs periodo anterior
        </p>
      )}
      {hint && <p className="text-carbon-400 mt-0.5 text-xs">{hint}</p>}
    </Card>
  )
}
