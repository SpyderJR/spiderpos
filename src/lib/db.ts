import Dexie, { type EntityTable } from 'dexie'

export interface LocalProduct {
  id: string
  storeId: string
  categoryId: string | null
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
}

db.version(2).stores({
  products: 'id, storeId, barcode, isFavorite, searchText, categoryId',
  parkedSales: 'id, storeId, createdAt',
  promotions: 'id, storeId, productId, categoryId',
})

export { db }
