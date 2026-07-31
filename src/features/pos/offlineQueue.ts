import { useLiveQuery } from 'dexie-react-hooks'
import { db, type PendingSale } from '../../lib/db'
import { checkoutSale, type CheckoutInput } from './api'

export async function queueSale(input: CheckoutInput, storeId: string): Promise<void> {
  const pending: PendingSale = {
    id: input.saleId,
    storeId,
    items: input.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
    })),
    payments: input.payments,
    customerId: input.customerId,
    discount: input.discount,
    notes: input.notes ?? null,
    clientCreatedAt: input.clientCreatedAt,
    queuedAt: Date.now(),
    lastError: null,
  }
  await db.pendingSales.put(pending)
}

export function usePendingSalesCount(storeId: string | undefined) {
  return useLiveQuery(
    async () => (storeId ? db.pendingSales.where('storeId').equals(storeId).count() : 0),
    [storeId],
    0,
  )
}

let syncing = false

/**
 * Reintenta en orden cada venta encolada. record_sale() es idempotente por
 * id (ON CONFLICT DO NOTHING), así que reintentar una venta que en
 * realidad ya llegó al servidor en un intento anterior nunca la duplica —
 * append-only real (PRD §6): una venta jamás se pierde ni se repite.
 */
export async function syncPendingSales(
  storeId: string,
): Promise<{ synced: number; failed: number }> {
  if (syncing || !navigator.onLine) return { synced: 0, failed: 0 }
  syncing = true
  let synced = 0
  let failed = 0

  try {
    const queue = await db.pendingSales.where('storeId').equals(storeId).sortBy('queuedAt')

    for (const sale of queue) {
      try {
        await checkoutSale({
          saleId: sale.id,
          items: sale.items.map((item) => ({
            productId: item.productId,
            name: '',
            unitPrice: item.unitPrice,
            unitCost: 0,
            quantity: item.quantity,
            discount: item.discount,
            unitType: 'piece',
          })),
          payments: sale.payments,
          customerId: sale.customerId,
          discount: sale.discount,
          notes: sale.notes ?? undefined,
          clientCreatedAt: sale.clientCreatedAt,
        })
        await db.pendingSales.delete(sale.id)
        synced += 1
      } catch (err) {
        failed += 1
        await db.pendingSales.update(sale.id, {
          lastError: err instanceof Error ? err.message : 'Error al sincronizar',
        })
        // Se detiene en el primer fallo real para no perder el orden
        // append-only; si fue un corte de red a medio lote, el resto se
        // reintentará en el siguiente ciclo igualmente.
        break
      }
    }
  } finally {
    syncing = false
  }

  return { synced, failed }
}

/** true si el error parece de conectividad (no una respuesta real del servidor). */
export function isNetworkError(err: unknown): boolean {
  if (!navigator.onLine) return true
  if (err instanceof TypeError) return true
  if (err instanceof Error && /failed to fetch|network/i.test(err.message)) return true
  return false
}
