import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="border-carbon-200 dark:border-carbon-700 flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-12 text-center">
      <span className="text-4xl" aria-hidden="true">
        {icon}
      </span>
      <p className="text-carbon-700 dark:text-carbon-200 font-semibold">{title}</p>
      {description && <p className="text-carbon-400 max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
