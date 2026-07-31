import { useOnlineStatus } from '../lib/useOnlineStatus'

export function ConnectionStatus() {
  const isOnline = useOnlineStatus()

  return (
    <span
      role="status"
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${
        isOnline
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}
        aria-hidden="true"
      />
      {isOnline ? 'En línea' : 'Sin conexión'}
    </span>
  )
}
