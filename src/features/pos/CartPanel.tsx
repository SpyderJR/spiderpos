import { useState } from 'react'
import { useCartStore, useCartSubtotal, useCartTotal } from '../../store/useCartStore'
import { Button } from '../../components/ui/Button'
import { SupervisorPinModal } from './SupervisorPinModal'

const UNIT_LABELS: Record<string, string> = { piece: 'pza', kg: 'kg', g: 'g', lt: 'lt', m: 'm' }

interface CartPanelProps {
  canDiscountWithoutPin: boolean
  onCheckout: () => void
  onPark: () => void
}

export function CartPanel({ canDiscountWithoutPin, onCheckout, onPark }: CartPanelProps) {
  const items = useCartStore((state) => state.items)
  const discount = useCartStore((state) => state.discount)
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const removeItem = useCartStore((state) => state.removeItem)
  const setDiscount = useCartStore((state) => state.setDiscount)
  const subtotal = useCartSubtotal()
  const total = useCartTotal()

  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [discountInput, setDiscountInput] = useState(false)

  function requestDiscount() {
    if (canDiscountWithoutPin) {
      setDiscountInput(true)
    } else {
      setPinModalOpen(true)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-carbon-400 p-6 text-center text-sm">El carrito está vacío.</p>
        ) : (
          <ul className="divide-carbon-100 dark:divide-carbon-800 flex flex-col divide-y">
            {items.map((item) => (
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
                    ${(item.unitPrice * item.quantity - item.discount).toFixed(2)}
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

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={requestDiscount}
            className="text-brand-600 dark:text-brand-400 hover:underline"
          >
            {discount > 0 ? 'Editar descuento' : '+ Aplicar descuento'}
          </button>
          {discount > 0 && (
            <span className="text-carbon-500 dark:text-carbon-400">−${discount.toFixed(2)}</span>
          )}
        </div>

        {discountInput && (
          <input
            type="number"
            inputMode="decimal"
            autoFocus
            defaultValue={discount || ''}
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
            disabled={items.length === 0}
            className="flex-1"
          >
            En espera
          </Button>
          <Button onClick={onCheckout} disabled={items.length === 0} className="flex-[2]">
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
    </div>
  )
}
