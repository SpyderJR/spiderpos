import type { LocalPromotion, LocalProduct } from '../../lib/db'

/** Encuentra la promoción activa (por fecha) aplicable a un producto. */
export function findApplicablePromotion(
  product: Pick<LocalProduct, 'id' | 'categoryId'>,
  promotions: LocalPromotion[],
): LocalPromotion | null {
  const now = Date.now()
  const candidates = promotions.filter((promo) => {
    if (!promo.active) return false
    if (promo.startsAt && new Date(promo.startsAt).getTime() > now) return false
    if (promo.endsAt && new Date(promo.endsAt).getTime() < now) return false
    if (promo.productId) return promo.productId === product.id
    if (promo.categoryId) return promo.categoryId === product.categoryId
    return false
  })
  return candidates[0] ?? null
}

export interface LinePricing {
  discount: number
  subtotal: number
  promotionName: string | null
}

/** Calcula el descuento total de la línea dada la promoción y la cantidad actual. */
export function computeLinePricing(
  unitPrice: number,
  quantity: number,
  promotion: LocalPromotion | null,
): LinePricing {
  const gross = unitPrice * quantity

  if (!promotion) return { discount: 0, subtotal: gross, promotionName: null }

  switch (promotion.type) {
    case 'percentage': {
      const discount = gross * ((promotion.value ?? 0) / 100)
      return { discount, subtotal: gross - discount, promotionName: promotion.name }
    }
    case 'fixed': {
      const discount = Math.min(gross, (promotion.value ?? 0) * quantity)
      return { discount, subtotal: gross - discount, promotionName: promotion.name }
    }
    case '2x1': {
      const freeUnits = Math.floor(quantity / 2)
      const discount = freeUnits * unitPrice
      return { discount, subtotal: gross - discount, promotionName: promotion.name }
    }
    case '3x2': {
      const freeUnits = Math.floor(quantity / 3)
      const discount = freeUnits * unitPrice
      return { discount, subtotal: gross - discount, promotionName: promotion.name }
    }
    case 'bulk_price': {
      if (promotion.minQuantity && quantity >= promotion.minQuantity && promotion.value != null) {
        const discount = Math.max(0, gross - promotion.value * quantity)
        return { discount, subtotal: gross - discount, promotionName: promotion.name }
      }
      return { discount: 0, subtotal: gross, promotionName: null }
    }
    default:
      return { discount: 0, subtotal: gross, promotionName: null }
  }
}
