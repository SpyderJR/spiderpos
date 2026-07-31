import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useCartStore } from '../../store/useCartStore'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { SupervisorPinModal } from './SupervisorPinModal'
import { listCustomers } from '../customers/api'
import { useCartPricing } from './useCartPricing'

const UNIT_LABELS: Record<string, string> = { piece: 'pza', kg: 'kg', g: 'g', lt: 'lt', m: 'm' }

interface CartPanelProps {
  storeId: string
  canDiscountWithoutPin: boolean
  onCheckout: () => void
  onPark: () => void
}

export function CartPanel({ storeId, canDiscountWithoutPin, onCheckout, onPark }: CartPanelProps) {
  const customerId = useCartStore((state) => state.customerId)
  const setCustomerId = useCartStore((state) => state.setCustomerId)
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const removeItem = useCartStore((state) => state.removeItem)
  const setDiscount = useCartStore((state) => state.setDiscount)
  const { pricedItems, subtotal, promotionsDiscount, manualDiscount, total } =
    useCartPricing(storeId)

  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [discountInput, setDiscountInput] = useState(false)
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false)

  const customersQuery = useQuery({
    queryKey: ['customers', storeId],
    queryFn: () => listCustomers(storeId),
    enabled: customerPickerOpen,
  })
  const selectedCustomer = customersQuery.data?.find((c) => c.id === customerId)

  function requestDiscount() {
    if (canDiscountWithoutPin) {
      setDiscountInput(true)
    } else {
      setPinModalOpen(true)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-carbon-100 dark:border-carbon-800 flex items-center justify-between border-b px-4 py-2">
        <span className="text-carbon-500 dark:text-carbon-400 text-sm">
          {selectedCustomer ? `Cliente: ${selectedCustomer.name}` : 'Sin cliente'}
        </span>
        <div className="flex gap-2">
          {customerId && (
            <button
              type="button"
              onClick={() => setCustomerId(null)}
              className="text-carbon-400 text-sm hover:underline"
            >
              Quitar
            </button>
          )}
          <button
            type="button"
            onClick={() => setCustomerPickerOpen(true)}
            className="text-brand-600 dark:text-brand-400 text-sm font-medium hover:underline"
          >
            {customerId ? 'Cambiar' : '+ Agregar'}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {pricedItems.length === 0 ? (
          <p className="text-carbon-400 p-6 text-center text-sm">El carrito está vacío.</p>
        ) : (
          <ul className="divide-carbon-100 dark:divide-carbon-800 flex flex-col divide-y">
            {pricedItems.map((item) => (
              <li
                key={item.productId}
                className="flex items-center justify-between gap-2 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-carbon-900 dark:text-paper truncate text-sm font-medium">
                    {item.name}
                  </p>
                  <p className="text-carbon-500 dark:text-carbon-400 text-xs">
                    ${item.unitPrice.toFixed(2)} / {UNIT_LABELS[item.unitType]}
                  </p>
                  {item.promotionName && (
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      🏷️ {item.promotionName}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {item.unitType === 'piece' ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="bg-carbon-100 text-carbon-700 dark:bg-carbon-800 dark:text-carbon-200 flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold"
                        aria-label="Restar"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="bg-carbon-100 text-carbon-700 dark:bg-carbon-800 dark:text-carbon-200 flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold"
                        aria-label="Sumar"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm font-medium">
                      {item.quantity} {UNIT_LABELS[item.unitType]}
                    </span>
                  )}
                  <span className="w-16 text-right text-sm font-semibold">
                    ${item.computedSubtotal.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    aria-label={`Quitar ${item.name}`}
                    className="text-carbon-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-carbon-100 dark:border-carbon-800 border-t p-4">
        <div className="text-carbon-500 dark:text-carbon-400 flex items-center justify-between text-sm">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>

        {promotionsDiscount > 0 && (
          <div className="flex items-center justify-between text-sm text-emerald-600 dark:text-emerald-400">
            <span>Promociones</span>
            <span>−${promotionsDiscount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={requestDiscount}
            className="text-brand-600 dark:text-brand-400 hover:underline"
          >
            {manualDiscount > 0 ? 'Editar descuento' : '+ Aplicar descuento'}
          </button>
          {manualDiscount > 0 && (
            <span className="text-carbon-500 dark:text-carbon-400">
              −${manualDiscount.toFixed(2)}
            </span>
          )}
        </div>

        {discountInput && (
          <input
            type="number"
            inputMode="decimal"
            autoFocus
            defaultValue={manualDiscount || ''}
            placeholder="Monto de descuento"
            onBlur={(e) => {
              setDiscount(Number.parseFloat(e.target.value) || 0)
              setDiscountInput(false)
            }}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 mt-1 w-full rounded-lg border px-3 py-1.5 text-sm"
          />
        )}

        <div className="text-carbon-900 dark:text-paper mt-2 flex items-center justify-between text-xl font-bold">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            variant="secondary"
            onClick={onPark}
            disabled={pricedItems.length === 0}
            className="flex-1"
          >
            En espera
          </Button>
          <Button onClick={onCheckout} disabled={pricedItems.length === 0} className="flex-[2]">
            Cobrar
          </Button>
        </div>
      </div>

      <SupervisorPinModal
        open={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
        onApproved={() => {
          setPinModalOpen(false)
          setDiscountInput(true)
        }}
      />

      <Modal
        open={customerPickerOpen}
        onClose={() => setCustomerPickerOpen(false)}
        title="Seleccionar cliente"
      >
        <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
          {customersQuery.data?.map((customer) => (
            <li key={customer.id}>
              <button
                type="button"
                onClick={() => {
                  setCustomerId(customer.id)
                  setCustomerPickerOpen(false)
                }}
                className="hover:bg-carbon-100 dark:hover:bg-carbon-800 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left"
              >
                <span>{customer.name}</span>
                {customer.credit_balance > 0 && (
                  <span className="text-sm text-amber-600 dark:text-amber-400">
                    ${customer.credit_balance.toFixed(2)}
                  </span>
                )}
              </button>
            </li>
          ))}
          {customersQuery.data?.length === 0 && (
            <p className="text-carbon-400 p-4 text-center text-sm">
              No hay clientes. Agrégalos desde el módulo Clientes.
            </p>
          )}
        </ul>
      </Modal>
    </div>
  )
}
