import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  elevated?: boolean
  glass?: boolean
}

export function Card({ children, elevated, glass, className = '', ...props }: CardProps) {
  return (
    <div
      className={`border-carbon-100 dark:border-carbon-800 rounded-2xl border ${
        glass ? 'glass-surface' : 'dark:bg-carbon-900 bg-white'
      } ${elevated ? 'shadow-[var(--shadow-elevated)]' : 'shadow-[var(--shadow-soft)]'} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
