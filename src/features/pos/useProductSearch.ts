import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type LocalProduct } from '../../lib/db'
import { normalizeText } from '../../lib/normalizeText'

/**
 * Índice local en memoria (respaldado por IndexedDB) para búsqueda
 * instantánea de productos: < 50ms incluso tecleando (PRD 5.B, 7).
 */
export function useProductSearch(storeId: string | undefined) {
  const products = useLiveQuery(
    () =>
      storeId
        ? db.products.where('storeId').equals(storeId).toArray()
        : Promise.resolve<LocalProduct[]>([]),
    [storeId],
    [] as LocalProduct[],
  )

  const barcodeIndex = useMemo(() => {
    const map = new Map<string, LocalProduct>()
    for (const product of products) {
      if (product.barcode) map.set(product.barcode, product)
    }
    return map
  }, [products])

  const favorites = useMemo(() => products.filter((p) => p.isFavorite), [products])

  function search(query: string, limit = 30): LocalProduct[] {
    const q = normalizeText(query)
    if (!q) return []
    const results: LocalProduct[] = []
    for (const product of products) {
      if (product.searchText.includes(q)) {
        results.push(product)
        if (results.length >= limit) break
      }
    }
    return results
  }

  function findByBarcode(code: string): LocalProduct | undefined {
    return barcodeIndex.get(code)
  }

  return { products, favorites, search, findByBarcode, isLoading: products === undefined }
}
