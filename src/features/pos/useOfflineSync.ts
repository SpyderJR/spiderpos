import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { syncPendingSales } from './offlineQueue'
import { useOnlineStatus } from '../../lib/useOnlineStatus'

const RETRY_INTERVAL_MS = 30_000

/**
 * Drena la cola de ventas offline al recuperar señal y cada 30s mientras
 * haya conexión (no todos los navegadores soportan la Background Sync API
 * nativa — Safari/iOS no la implementa — así que el reintento por evento
 * `online` + un intervalo mientras la pestaña está abierta cubre el caso
 * real: el POS de un negocio se queda abierto durante todo el turno).
 */
export function useOfflineSync(storeId: string | undefined) {
  const isOnline = useOnlineStatus()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!storeId || !isOnline) return

    async function drain() {
      const result = await syncPendingSales(storeId!)
      if (result.synced > 0) {
        queryClient.invalidateQueries({ queryKey: ['sales', storeId] })
        queryClient.invalidateQueries({ queryKey: ['products'] })
      }
    }

    drain()
    const interval = setInterval(drain, RETRY_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [storeId, isOnline, queryClient])
}
