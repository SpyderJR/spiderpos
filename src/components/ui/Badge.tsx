import type { ReactNode } from 'react'

export type BadgeTone = 'success' | 'warning' | 'critical' | 'info' | 'neutral' | 'brand'

interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  dot?: boolean
  className?: string
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  neutral: 'bg-carbon-100 text-carbon-600 dark:bg-carbon-800 dark:text-carbon-300',
  brand: 'bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300',
}

const DOT_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
  info: 'bg-blue-500',
  neutral: 'bg-carbon-400',
  brand: 'bg-brand-500',
}

export function Badge({ tone = 'neutral', children, dot, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[tone]} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_CLASSES[tone]}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}
