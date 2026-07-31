interface StatTileProps {
  label: string
  value: string
  hint?: string
}

export function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <div className="border-carbon-200 dark:border-carbon-800 dark:bg-carbon-900 rounded-2xl border bg-white p-4">
      <p className="text-carbon-500 dark:text-carbon-400 text-sm">{label}</p>
      <p className="text-carbon-900 dark:text-paper mt-1 text-2xl font-bold tabular-nums">
        {value}
      </p>
      {hint && <p className="text-carbon-400 mt-0.5 text-xs">{hint}</p>}
    </div>
  )
}
