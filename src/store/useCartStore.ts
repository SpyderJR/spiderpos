import { create } from 'zustand'
import type { LocalProduct } from '../lib/db'

export interface CartLine {
  productId: string
  name: string
  unitPrice: number
  unitCost: number
  unitType: LocalProduct['unitType']
  quantity: number
  discount: number
}

interface CartState {
  items: CartLine[]
  customerId: string | null
  discount: number
  notes: string
  addProduct: (product: LocalProduct, quantity?: number) => void
  updateQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  setDiscount: (discount: number) => void
  setCustomerId: (customerId: string | null) => void
  loadItems: (items: CartLine[], customerId?: string | null) => void
  clear: () => void
}

function subtotalFor(items: CartLine[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity - item.discount, 0)
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerId: null,
  discount: 0,
  notes: '',

  addProduct: (product, quantity = 1) => {
    const items = get().items
    const existing = items.find((item) => item.productId === product.id)
    if (existing && product.unitType === 'piece') {
      set({
        items: items.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + quantity } : item,
        ),
      })
      return
    }
    set({
      items: [
        ...items,
        {
          productId: product.id,
          name: product.name,
          unitPrice: product.price,
          unitCost: product.cost,
          unitType: product.unitType,
          quantity,
          discount: 0,
        },
      ],
    })
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId)
      return
    }
    set({
      items: get().items.map((item) =>
        item.productId === productId ? { ...item, quantity } : item,
      ),
    })
  },

  removeItem: (productId) => {
    set({ items: get().items.filter((item) => item.productId !== productId) })
  },

  setDiscount: (discount) => set({ discount: Math.max(0, discount) }),
  setCustomerId: (customerId) => set({ customerId }),
  loadItems: (items, customerId = null) => set({ items, customerId, discount: 0, notes: '' }),
  clear: () => set({ items: [], customerId: null, discount: 0, notes: '' }),
}))

export function useCartSubtotal(): number {
  return useCartStore((state) => subtotalFor(state.items))
}

export function useCartTotal(): number {
  return useCartStore((state) => Math.max(0, subtotalFor(state.items) - state.discount))
}
