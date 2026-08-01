import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { playTap } from '../../lib/sound'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  loading?: boolean
  silent?: boolean
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-gradient-to-br from-violet-600 to-brand-600 text-white shadow-[var(--shadow-glow-brand)] hover:brightness-110 active:scale-[0.98] active:brightness-95 disabled:opacity-60 disabled:shadow-none',
  secondary:
    'bg-carbon-100 text-carbon-800 hover:bg-carbon-200 active:scale-[0.98] dark:bg-carbon-800 dark:text-carbon-100 dark:hover:bg-carbon-700',
  ghost:
    'bg-transparent text-carbon-600 hover:bg-carbon-100 active:scale-[0.98] dark:text-carbon-300 dark:hover:bg-carbon-800',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:scale-[0.98] disabled:opacity-60',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', loading, silent, disabled, className = '', children, onClick, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      onClick={(e) => {
        if (!silent) playTap()
        onClick?.(e)
      }}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:active:scale-100 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {loading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  )
})
