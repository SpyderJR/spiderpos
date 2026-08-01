import Dexie, { type EntityTable } from 'dexie'

export interface LocalProduct {
  id: string
  storeId: string
  categoryId: string | null
  categoryName: string | null
  barcode: string | null
  name: string
  price: number
  cost: number
  stock: number
  unitType: 'piece' | 'kg' | 'g' | 'lt' | 'm'
  minStock: number
  isFavorite: boolean
  imageUrl: string | null
  active: boolean
  /** Nombre normalizado (minúsculas, sin acentos) para búsqueda instantánea. */
  searchText: string
}

export interface ParkedSaleItem {
  productId: string
  name: string
  unitPrice: number
  unitCost: number
  quantity: number
  discount: number
  unitType: LocalProduct['unitType']
}

export interface ParkedSale {
  id: string
  storeId: string
  label: string
  customerId: string | null
  items: ParkedSaleItem[]
  createdAt: number
}

export interface PendingSalePayment {
  method: 'cash' | 'card' | 'transfer' | 'credit'
  amount: number
  change_given?: number
}

export interface PendingSaleItem {
  productId: string
  quantity: number
  unitPrice: number
  discount: number
}

/**
 * Venta hecha sin conexión: se guarda con el mismo id (UUID generado en
 * cliente) y clientCreatedAt que se le habría mandado a record_sale(), para
 * que al sincronizar sea indistinguible de una venta normal — record_sale
 * es idempotente por id, así que reintentar nunca duplica.
 */
export interface PendingSale {
  id: string
  storeId: string
  items: PendingSaleItem[]
  payments: PendingSalePayment[]
  customerId: string | null
  discount: number
  notes: string | null
  clientCreatedAt: string
  queuedAt: number
  lastError: string | null
}

export interface LocalCustomer {
  id: string
  storeId: string
  name: string
  phone: string | null
  creditLimit: number
  creditBalance: number
}

export interface LocalPromotion {
  id: string
  storeId: string
  name: string
  type: 'percentage' | 'fixed' | '2x1' | '3x2' | 'bulk_price'
  value: number | null
  minQuantity: number | null
  productId: string | null
  categoryId: string | null
  startsAt: string | null
  endsAt: string | null
  active: boolean
}

const db = new Dexie('spiderpos') as Dexie & {
  products: EntityTable<LocalProduct, 'id'>
  parkedSales: EntityTable<ParkedSale, 'id'>
  promotions: EntityTable<LocalPromotion, 'id'>
  pendingSales: EntityTable<PendingSale, 'id'>
  customers: EntityTable<LocalCustomer, 'id'>
}

db.version(2).stores({
  products: 'id, storeId, barcode, isFavorite, searchText, categoryId',
  parkedSales: 'id, storeId, createdAt',
  promotions: 'id, storeId, productId, categoryId',
})

db.version(3).stores({
  products: 'id, storeId, barcode, isFavorite, searchText, categoryId',
  parkedSales: 'id, storeId, createdAt',
  promotions: 'id, storeId, productId, categoryId',
  pendingSales: 'id, storeId, queuedAt',
})

db.version(4).stores({
  products: 'id, storeId, barcode, isFavorite, searchText, categoryId',
  parkedSales: 'id, storeId, createdAt',
  promotions: 'id, storeId, productId, categoryId',
  pendingSales: 'id, storeId, queuedAt',
  customers: 'id, storeId, name',
})

export { db }
