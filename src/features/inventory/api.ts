import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database/types'

type Product = Database['public']['Tables']['products']['Row']
type ProductInsert = Database['public']['Tables']['products']['Insert']
type ProductUpdate = Database['public']['Tables']['products']['Update']
type Category = Database['public']['Tables']['categories']['Row']
type Supplier = Database['public']['Tables']['suppliers']['Row']
type SupplierInsert = Database['public']['Tables']['suppliers']['Insert']
type ProductVariant = Database['public']['Tables']['product_variants']['Row']
type ProductVariantInsert = Database['public']['Tables']['product_variants']['Insert']
type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row']

export async function listProducts(
  storeId: string,
): Promise<(Product & { categories: { name: string } | null })[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name)')
    .eq('store_id', storeId)
    .order('name')
  if (error) throw error
  return data
}

export async function listLowStockProducts(storeId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', storeId)
    .eq('active', true)
    .order('name')
  if (error) throw error
  return data.filter((p) => p.stock <= p.min_stock)
}

export async function createProduct(product: ProductInsert): Promise<Product> {
  const { data, error } = await supabase.from('products').insert(product).select().single()
  if (error) throw error
  return data
}

export async function updateProduct(id: string, values: ProductUpdate): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update(values)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function adjustStock(
  productId: string,
  newStock: number,
  reason: string,
): Promise<void> {
  const { error } = await supabase.rpc('adjust_stock', {
    p_product_id: productId,
    p_new_stock: newStock,
    p_reason: reason,
  })
  if (error) throw error
}

export async function listCategories(storeId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('store_id', storeId)
    .order('name')
  if (error) throw error
  return data
}

export async function createCategory(storeId: string, name: string): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ store_id: storeId, name })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listVariants(productId: string): Promise<ProductVariant[]> {
  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
  if (error) throw error
  return data
}

export async function createVariant(variant: ProductVariantInsert): Promise<ProductVariant> {
  const { data, error } = await supabase.from('product_variants').insert(variant).select().single()
  if (error) throw error
  return data
}

export async function deleteVariant(id: string): Promise<void> {
  const { error } = await supabase.from('product_variants').delete().eq('id', id)
  if (error) throw error
}

export async function listSuppliers(storeId: string): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('store_id', storeId)
    .order('name')
  if (error) throw error
  return data
}

export async function createSupplier(supplier: SupplierInsert): Promise<Supplier> {
  const { data, error } = await supabase.from('suppliers').insert(supplier).select().single()
  if (error) throw error
  return data
}

export async function updateSupplier(
  id: string,
  values: Partial<SupplierInsert>,
): Promise<Supplier> {
  const { data, error } = await supabase
    .from('suppliers')
    .update(values)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase.from('suppliers').delete().eq('id', id)
  if (error) throw error
}

export interface PurchaseOrderWithSupplier extends PurchaseOrder {
  suppliers: { name: string } | null
}

export async function listPurchaseOrders(storeId: string): Promise<PurchaseOrderWithSupplier[]> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*, suppliers(name)')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export interface NewPurchaseOrderItem {
  product_id: string
  quantity: number
  unit_cost: number
}

export async function createPurchaseOrder(
  storeId: string,
  employeeId: string,
  supplierId: string | null,
  items: NewPurchaseOrderItem[],
): Promise<string> {
  const total = items.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0)
  const { data: po, error } = await supabase
    .from('purchase_orders')
    .insert({
      store_id: storeId,
      supplier_id: supplierId,
      status: 'ordered',
      total,
      created_by: employeeId,
    })
    .select('id')
    .single()
  if (error) throw error

  const { error: itemsError } = await supabase.from('purchase_order_items').insert(
    items.map((item) => ({
      store_id: storeId,
      purchase_order_id: po.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
    })),
  )
  if (itemsError) throw itemsError

  return po.id
}

export async function listPurchaseOrderItems(purchaseOrderId: string) {
  const { data, error } = await supabase
    .from('purchase_order_items')
    .select('*, products(name)')
    .eq('purchase_order_id', purchaseOrderId)
  if (error) throw error
  return data
}

export async function receivePurchaseOrder(purchaseOrderId: string): Promise<void> {
  const { error } = await supabase.rpc('receive_purchase_order', {
    p_purchase_order_id: purchaseOrderId,
  })
  if (error) throw error
}

export interface CsvProductRow {
  barcode: string
  name: string
  price: number
  cost: number
  stock: number
  unit_type: string
  min_stock: number
}

export async function bulkImportProducts(storeId: string, rows: CsvProductRow[]): Promise<number> {
  const { error, count } = await supabase.from('products').insert(
    rows.map((row) => ({
      store_id: storeId,
      barcode: row.barcode || null,
      name: row.name,
      price: row.price,
      cost: row.cost,
      stock: row.stock,
      unit_type: (['piece', 'kg', 'g', 'lt', 'm'].includes(row.unit_type)
        ? row.unit_type
        : 'piece') as Database['public']['Enums']['product_unit_type'],
      min_stock: row.min_stock,
    })),
    { count: 'exact' },
  )
  if (error) throw error
  return count ?? rows.length
}
