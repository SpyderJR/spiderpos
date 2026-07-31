import { useQuery } from '@tanstack/react-query'
import { syncProducts } from './sync'

/** Descarga el catálogo de la tienda a IndexedDB al entrar al POS (y bajo demanda). */
export function useProductSync(storeId: string | undefined) {
  const query = useQuery({
    queryKey: ['product-sync', storeId],
    queryFn: () => syncProducts(storeId!),
    enabled: !!storeId,
    staleTime: 30_000,
  })

  return {
    syncing: query.isFetching,
    error: query.error instanceof Error ? query.error.message : null,
    lastSyncedAt: query.dataUpdatedAt || null,
    resync: query.refetch,
  }
}
