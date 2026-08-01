import { supabase } from '../../lib/supabase'
import { db, type LocalProduct, type LocalPromotion, type LocalCustomer } from '../../lib/db'
import { normalizeText } from '../../lib/normalizeText'

export async function syncProducts(storeId: string): Promise<number> {
  const { data, error } = await supabase
    .from('products')
    .select(
      'id, store_id, category_id, barcode, name, price, cost, stock, unit_type, min_stock, is_favorite, image_url, active, categories(name)',
    )
    .eq('store_id', storeId)
    .eq('active', true)

  if (error) throw error

  const localProducts: LocalProduct[] = data.map((p) => ({
    id: p.id,
    storeId: p.store_id,
    categoryId: p.category_id,
    categoryName: p.categories?.name ?? null,
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

export async function syncPromotions(storeId: string): Promise<number> {
  const { data, error } = await supabase
    .from('promotions')
    .select(
      'id, store_id, name, type, value, min_quantity, product_id, category_id, starts_at, ends_at, active',
    )
    .eq('store_id', storeId)
    .eq('active', true)

  if (error) throw error

  const localPromotions: LocalPromotion[] = data.map((p) => ({
    id: p.id,
    storeId: p.store_id,
    name: p.name,
    type: p.type,
    value: p.value,
    minQuantity: p.min_quantity,
    productId: p.product_id,
    categoryId: p.category_id,
    startsAt: p.starts_at,
    endsAt: p.ends_at,
    active: p.active,
  }))

  await db.transaction('rw', db.promotions, async () => {
    await db.promotions.where('storeId').equals(storeId).delete()
    await db.promotions.bulkAdd(localPromotions)
  })

  return localPromotions.length
}

/**
 * Los clientes se sincronizan a IndexedDB igual que el catálogo: sin esto,
 * el fiado (crédito) no podría venderse offline porque no habría a quién
 * cargarle la cuenta (PRD §6: "efectivo y fiado funcionan 100% offline").
 */
export async function syncCustomers(storeId: string): Promise<number> {
  const { data, error } = await supabase
    .from('customers')
    .select('id, store_id, name, phone, credit_limit, credit_balance')
    .eq('store_id', storeId)
    .eq('active', true)

  if (error) throw error

  const localCustomers: LocalCustomer[] = data.map((c) => ({
    id: c.id,
    storeId: c.store_id,
    name: c.name,
    phone: c.phone,
    creditLimit: c.credit_limit,
    creditBalance: c.credit_balance,
  }))

  await db.transaction('rw', db.customers, async () => {
    await db.customers.where('storeId').equals(storeId).delete()
    await db.customers.bulkAdd(localCustomers)
  })

  return localCustomers.length
}
