import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type LocalPromotion, type LocalProduct } from '../../lib/db'
import { useCartStore, type CartLine } from '../../store/useCartStore'
import { findApplicablePromotion, computeLinePricing } from './promotionsEngine'
import { useCurrentMember } from '../auth/useCurrentMember'

export interface PricedCartLine extends CartLine {
  computedDiscount: number
  computedSubtotal: number
  promotionName: string | null
}

/** Aplica promociones activas a cada línea del carrito en tiempo real. */
export function useCartPricing(storeId: string | undefined) {
  const items = useCartStore((state) => state.items)
  const manualDiscount = useCartStore((state) => state.discount)
  const { data: member } = useCurrentMember()
  const taxEnabled = member?.stores?.tax_enabled ?? false
  const taxRate = member?.stores?.tax_rate ?? 0

  const promotions = useLiveQuery(
    () =>
      storeId
        ? db.promotions.where('storeId').equals(storeId).toArray()
        : Promise.resolve<LocalPromotion[]>([]),
    [storeId],
    [] as LocalPromotion[],
  )
  const products = useLiveQuery(
    () =>
      storeId
        ? db.products.where('storeId').equals(storeId).toArray()
        : Promise.resolve<LocalProduct[]>([]),
    [storeId],
    [] as LocalProduct[],
  )

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  const pricedItems: PricedCartLine[] = useMemo(
    () =>
      items.map((item) => {
        const product = productById.get(item.productId)
        const promotion = product ? findApplicablePromotion(product, promotions) : null
        const pricing = computeLinePricing(item.unitPrice, item.quantity, promotion)
        return {
          ...item,
          computedDiscount: pricing.discount,
          computedSubtotal: pricing.subtotal,
          promotionName: pricing.promotionName,
        }
      }),
    [items, productById, promotions],
  )

  const subtotal = pricedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const promotionsDiscount = pricedItems.reduce((sum, item) => sum + item.computedDiscount, 0)
  const taxable = Math.max(0, subtotal - promotionsDiscount - manualDiscount)
  // Espejo exacto del cálculo server-side en record_sale() — así lo que se
  // le cobra al cliente coincide con lo que el servidor va a validar.
  const tax = taxEnabled ? Math.round(taxable * taxRate) / 100 : 0
  const total = taxable + tax

  return {
    pricedItems,
    subtotal,
    promotionsDiscount,
    manualDiscount,
    taxEnabled,
    taxRate,
    tax,
    total,
  }
}
