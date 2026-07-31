import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Modal } from '../../components/ui/Modal'
import { fetchNotifications } from './api'

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
}

interface NotificationCenterProps {
  storeId: string | undefined
}

export function NotificationCenter({ storeId }: NotificationCenterProps) {
  const [open, setOpen] = useState(false)

  const query = useQuery({
    queryKey: ['notifications', storeId],
    queryFn: () => fetchNotifications(storeId!),
    enabled: !!storeId,
    refetchInterval: 60_000,
  })

  const notifications = query.data ?? []
  const criticalCount = notifications.filter((n) => n.severity === 'critical').length

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Notificaciones"
        className="text-carbon-500 hover:bg-carbon-100 dark:text-carbon-400 dark:hover:bg-carbon-800 relative flex min-h-11 min-w-11 items-center justify-center rounded-xl text-lg"
      >
        🔔
        {notifications.length > 0 && (
          <span
            className={`absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full ${criticalCount > 0 ? 'bg-red-500' : 'bg-amber-500'}`}
            aria-hidden="true"
          />
        )}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Notificaciones">
        {notifications.length === 0 && (
          <p className="text-carbon-400 py-6 text-center text-sm">
            No hay notificaciones. Todo en orden. ✅
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => {
            const content = (
              <div className="border-carbon-100 dark:border-carbon-800 flex items-start gap-3 rounded-xl border p-3">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[n.severity]}`}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-carbon-900 dark:text-paper text-sm font-medium">{n.title}</p>
                  <p className="text-carbon-500 dark:text-carbon-400 text-xs">{n.body}</p>
                </div>
              </div>
            )
            return (
              <li key={n.id}>
                {n.href ? (
                  <Link to={n.href} onClick={() => setOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            )
          })}
        </ul>
      </Modal>
    </>
  )
}
