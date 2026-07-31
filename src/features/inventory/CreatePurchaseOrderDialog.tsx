import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { listSuppliers, listProducts, createPurchaseOrder, type NewPurchaseOrderItem } from './api'

interface CreatePurchaseOrderDialogProps {
  open: boolean
  onClose: () => void
  storeId: string
  employeeId: string
}

export function CreatePurchaseOrderDialog({
  open,
  onClose,
  storeId,
  employeeId,
}: CreatePurchaseOrderDialogProps) {
  const queryClient = useQueryClient()
  const [supplierId, setSupplierId] = useState('')
  const [items, setItems] = useState<(NewPurchaseOrderItem & { name: string })[]>([])
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitCost, setUnitCost] = useState('')

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', storeId],
    queryFn: () => listSuppliers(storeId),
    enabled: open,
  })
  const productsQuery = useQuery({
    queryKey: ['products', storeId],
    queryFn: () => listProducts(storeId),
    enabled: open,
  })

  const total = items.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0)

  function addItem() {
    const product = productsQuery.data?.find((p) => p.id === productId)
    const qty = Number.parseFloat(quantity)
    const cost = Number.parseFloat(unitCost)
    if (!product || !(qty > 0) || !(cost >= 0)) return
    setItems((prev) => [
      ...prev,
      { product_id: product.id, name: product.name, quantity: qty, unit_cost: cost },
    ])
    setProductId('')
    setQuantity('')
    setUnitCost('')
  }

  const mutation = useMutation({
    mutationFn: () => createPurchaseOrder(storeId, employeeId, supplierId || null, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', storeId] })
      setItems([])
      setSupplierId('')
      onClose()
    },
  })

  return (
    <Modal open={open} onClose={onClose} title="Nueva orden de compra">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="supplier"
            className="text-carbon-700 dark:text-carbon-300 text-sm font-medium"
          >
            Proveedor
          </label>
          <select
            id="supplier"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 rounded-xl border bg-white px-4 py-2.5"
          >
            <option value="">Sin especificar</option>
            {suppliersQuery.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {items.length > 0 && (
          <ul className="flex flex-col gap-1">
            {items.map((item, i) => (
              <li
                key={i}
                className="bg-carbon-50 dark:bg-carbon-800 flex justify-between rounded-lg px-3 py-2 text-sm"
              >
                <span>
                  {item.quantity} x {item.name} @ ${item.unit_cost.toFixed(2)}
                </span>
                <span>${(item.quantity * item.unit_cost).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-3 gap-2">
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 col-span-3 rounded-lg border px-2 py-2 text-sm"
          >
            <option value="">Selecciona producto</option>
            {productsQuery.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            placeholder="Cantidad"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 rounded-lg border px-2 py-2 text-sm"
          />
          <input
            placeholder="Costo unitario"
            type="number"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 rounded-lg border px-2 py-2 text-sm"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={addItem}
          disabled={!productId || !quantity || !unitCost}
        >
          + Agregar artículo
        </Button>

        <div className="border-carbon-100 text-carbon-900 dark:border-carbon-800 dark:text-paper flex justify-between border-t pt-3 font-bold">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>

        {mutation.isError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {(mutation.error as Error).message}
          </p>
        )}

        <Button
          onClick={() => mutation.mutate()}
          disabled={items.length === 0}
          loading={mutation.isPending}
          className="w-full"
        >
          Crear orden de compra
        </Button>
      </div>
    </Modal>
  )
}
