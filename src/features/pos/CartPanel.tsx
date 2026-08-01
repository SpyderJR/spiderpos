import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, motion } from 'framer-motion'
import { useCartStore } from '../../store/useCartStore'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/ui/EmptyState'
import { SupervisorPinModal } from './SupervisorPinModal'
import { db, type LocalCustomer } from '../../lib/db'
import { useCartPricing } from './useCartPricing'
import { playPop } from '../../lib/sound'

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

  const customers = useLiveQuery(
    () => db.customers.where('storeId').equals(storeId).sortBy('name'),
    [storeId],
    [] as LocalCustomer[],
  )
  const selectedCustomer = customers.find((c) => c.id === customerId)

  function requestDiscount() {
    if (canDiscountWithoutPin) {
      setDiscountInput(true)
    } else {
      setPinModalOpen(true)
    }
  }

  function step(productId: string, quantity: number) {
    playPop()
    updateQuantity(productId, quantity)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-carbon-100 dark:border-carbon-800 flex items-center justify-between border-b px-4 py-3">
        <span className="text-carbon-500 dark:text-carbon-400 flex items-center gap-1.5 text-sm">
          <span aria-hidden="true">🧑</span>
          {selectedCustomer ? selectedCustomer.name : 'Sin cliente'}
        </span>
        <div className="flex gap-3">
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
            className="text-brand-600 dark:text-brand-400 text-sm font-semibold hover:underline"
          >
            {customerId ? 'Cambiar' : '+ Agregar'}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {pricedItems.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon="🛒"
              title="El carrito está vacío"
              description="Toca un producto para agregarlo."
            />
          </div>
        ) : (
          <ul className="divide-carbon-100 dark:divide-carbon-800 flex flex-col divide-y">
            <AnimatePresence initial={false}>
              {pricedItems.map((item) => (
                <motion.li
                  key={item.productId}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-between gap-2 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-carbon-900 dark:text-paper truncate text-sm font-medium">
                      {item.name}
                    </p>
                    <p className="text-carbon-500 dark:text-carbon-400 text-xs tabular-nums">
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
                      <div className="bg-carbon-50 dark:bg-carbon-800 flex items-center gap-1 rounded-full p-0.5">
                        <button
                          type="button"
                          onClick={() => step(item.productId, item.quantity - 1)}
                          className="text-carbon-700 hover:bg-carbon-200 dark:text-carbon-200 dark:hover:bg-carbon-700 flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold active:scale-90"
                          aria-label="Restar"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => step(item.productId, item.quantity + 1)}
                          className="text-carbon-700 hover:bg-carbon-200 dark:text-carbon-200 dark:hover:bg-carbon-700 flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold active:scale-90"
                          aria-label="Sumar"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm font-medium tabular-nums">
                        {item.quantity} {UNIT_LABELS[item.unitType]}
                      </span>
                    )}
                    <span className="w-16 text-right text-sm font-bold tabular-nums">
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
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <div className="border-carbon-100 dark:border-carbon-800 border-t p-4">
        <div className="text-carbon-500 dark:text-carbon-400 flex items-center justify-between text-sm">
          <span>Subtotal</span>
          <span className="tabular-nums">${subtotal.toFixed(2)}</span>
        </div>

        {promotionsDiscount > 0 && (
          <div className="flex items-center justify-between text-sm text-emerald-600 dark:text-emerald-400">
            <span>Promociones</span>
            <span className="tabular-nums">−${promotionsDiscount.toFixed(2)}</span>
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
            <span className="text-carbon-500 dark:text-carbon-400 tabular-nums">
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

        <div className="text-carbon-900 dark:text-paper mt-2 flex items-center justify-between text-2xl font-bold tabular-nums">
          <span className="text-base font-semibold">Total</span>
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
            Cobrar (F4)
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
          {customers.map((customer) => (
            <li key={customer.id}>
              <button
                type="button"
                onClick={() => {
                  setCustomerId(customer.id)
                  setCustomerPickerOpen(false)
                }}
                className="hover:bg-carbon-100 dark:hover:bg-carbon-800 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left"
              >
                <span className="to-brand-600 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 text-sm font-bold text-white">
                  {customer.name.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1">{customer.name}</span>
                {customer.creditBalance > 0 && (
                  <span className="text-sm text-amber-600 tabular-nums dark:text-amber-400">
                    ${customer.creditBalance.toFixed(2)}
                  </span>
                )}
              </button>
            </li>
          ))}
          {customers.length === 0 && (
            <EmptyState
              icon="🧑‍🤝‍🧑"
              title="Sin clientes todavía"
              description="Agrégalos desde el módulo Clientes."
            />
          )}
        </ul>
      </Modal>
    </div>
  )
}
