import { useOnlineStatus } from '../lib/useOnlineStatus'
import { usePendingSalesCount } from '../features/pos/offlineQueue'
import { useCurrentMember } from '../features/auth/useCurrentMember'

export function ConnectionStatus() {
  const isOnline = useOnlineStatus()
  const { data: member } = useCurrentMember()
  const pendingCount = usePendingSalesCount(member?.store_id)

  const label = pendingCount
    ? `${isOnline ? 'En línea' : 'Sin conexión'} — ${pendingCount} venta${pendingCount === 1 ? '' : 's'} por sincronizar`
    : isOnline
      ? 'En línea'
      : 'Sin conexión'

  return (
    <span
      role="status"
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${
        isOnline
          ? pendingCount
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
      }`}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${isOnline && !pendingCount ? 'bg-emerald-500' : 'bg-amber-500'}`}
        aria-hidden="true"
      />
      <span className="hidden sm:inline">{label}</span>
    </span>
  )
}
