import { useLiveQuery } from 'dexie-react-hooks'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { db } from '../../lib/db'
import { useCartStore } from '../../store/useCartStore'

interface ParkedSalesDrawerProps {
  open: boolean
  onClose: () => void
  storeId: string
}

export function ParkedSalesDrawer({ open, onClose, storeId }: ParkedSalesDrawerProps) {
  const loadItems = useCartStore((state) => state.loadItems)
  const parkedSales = useLiveQuery(
    () => db.parkedSales.where('storeId').equals(storeId).sortBy('createdAt'),
    [storeId],
    [],
  )

  async function resume(id: string) {
    const parked = await db.parkedSales.get(id)
    if (!parked) return
    loadItems(
      parked.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        unitPrice: item.unitPrice,
        unitCost: item.unitCost,
        unitType: item.unitType,
        quantity: item.quantity,
        discount: item.discount,
      })),
      parked.customerId,
    )
    await db.parkedSales.delete(id)
    onClose()
  }

  async function discard(id: string) {
    await db.parkedSales.delete(id)
  }

  return (
    <Modal open={open} onClose={onClose} title="Tickets en espera">
      {!parkedSales || parkedSales.length === 0 ? (
        <p className="text-carbon-500 dark:text-carbon-400 text-center text-sm">
          No hay tickets en espera.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {parkedSales.map((sale) => {
            const total = sale.items.reduce(
              (sum, i) => sum + i.unitPrice * i.quantity - i.discount,
              0,
            )
            return (
              <li
                key={sale.id}
                className="border-carbon-200 dark:border-carbon-700 flex items-center justify-between rounded-xl border p-3"
              >
                <div>
                  <p className="text-carbon-900 dark:text-paper font-medium">{sale.label}</p>
                  <p className="text-carbon-500 dark:text-carbon-400 text-sm">
                    {sale.items.length} artículo(s) · ${total.toFixed(2)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => discard(sale.id)}>
                    Descartar
                  </Button>
                  <Button onClick={() => resume(sale.id)}>Reanudar</Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
