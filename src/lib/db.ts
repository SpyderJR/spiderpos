import Dexie, { type EntityTable } from 'dexie'

export interface LocalProduct {
  id: string
  storeId: string
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

const db = new Dexie('spiderpos') as Dexie & {
  products: EntityTable<LocalProduct, 'id'>
  parkedSales: EntityTable<ParkedSale, 'id'>
}

db.version(1).stores({
  products: 'id, storeId, barcode, isFavorite, searchText',
  parkedSales: 'id, storeId, createdAt',
})

export { db }
