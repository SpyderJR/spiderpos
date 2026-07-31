import { useQuery } from '@tanstack/react-query'
import { syncProducts, syncPromotions, syncCustomers } from './sync'

/** Descarga el catálogo, promociones y clientes de la tienda a IndexedDB al entrar al POS (y bajo demanda), para que la venta (incluido fiado) funcione sin conexión. */
export function useProductSync(storeId: string | undefined) {
  const query = useQuery({
    queryKey: ['product-sync', storeId],
    queryFn: async () => {
      const [productCount] = await Promise.all([
        syncProducts(storeId!),
        syncPromotions(storeId!),
        syncCustomers(storeId!),
      ])
      return productCount
    },
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
