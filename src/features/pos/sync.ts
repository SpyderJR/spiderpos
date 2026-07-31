import { supabase } from '../../lib/supabase'
import { db, type LocalProduct } from '../../lib/db'
import { normalizeText } from '../../lib/normalizeText'

export async function syncProducts(storeId: string): Promise<number> {
  const { data, error } = await supabase
    .from('products')
    .select(
      'id, store_id, barcode, name, price, cost, stock, unit_type, min_stock, is_favorite, image_url, active',
    )
    .eq('store_id', storeId)
    .eq('active', true)

  if (error) throw error

  const localProducts: LocalProduct[] = data.map((p) => ({
    id: p.id,
    storeId: p.store_id,
    barcode: p.barcode,
    name: p.name,
    price: p.price,
    cost: p.cost,
    stock: p.stock,
    unitType: p.unit_type,
    minStock: p.min_stock,
    isFavorite: p.is_favorite,
    imageUrl: p.image_url,
    active: p.active,
    searchText: normalizeText(`${p.name} ${p.barcode ?? ''}`),
  }))

  await db.transaction('rw', db.products, async () => {
    await db.products.where('storeId').equals(storeId).delete()
    await db.products.bulkAdd(localProducts)
  })

  return localProducts.length
}
