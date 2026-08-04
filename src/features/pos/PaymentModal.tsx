import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import type { PaymentInput } from './api'

const METHOD_LABELS: Record<PaymentInput['method'], string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  credit: 'Fiado',
}

// Efectivo se cobra y cuenta en el momento (por eso calculamos cambio).
// Tarjeta y transferencia se cobran FUERA de la app (terminal física del
// banco/Clip, o SPEI a la cuenta de la tienda) — aquí solo se registra el
// monto ya aprobado, para que el cajero no espere que la app "procese" algo
// que ya pasó en otro dispositivo.
const EXTERNAL_PAYMENT_HINTS: Partial<Record<PaymentInput['method'], string>> = {
  card: 'Cobra primero en tu terminal física (datáfono/Clip) y, ya aprobado, registra aquí el monto exacto.',
  transfer: 'Confirma que el pago ya llegó a tu cuenta antes de registrarlo aquí.',
}

interface PaymentModalProps {
  open: boolean
  total: number
  hasCustomer: boolean
  isOnline: boolean
  submitting: boolean
  error: string | null
  onClose: () => void
  onConfirm: (payments: PaymentInput[]) => void
}

export function PaymentModal({
  open,
  total,
  hasCustomer,
  isOnline,
  submitting,
  error,
  onClose,
  onConfirm,
}: PaymentModalProps) {
  const [payments, setPayments] = useState<PaymentInput[]>([])
  const [pendingMethod, setPendingMethod] = useState<PaymentInput['method'] | null>(null)
  const [amountInput, setAmountInput] = useState('')

  const paid = payments.reduce((sum, p) => sum + p.amount, 0)
  const remaining = Math.max(0, Math.round((total - paid) * 100) / 100)
  const change = Math.max(0, Math.round((paid - total) * 100) / 100)

  function openMethod(method: PaymentInput['method']) {
    setPendingMethod(method)
    setAmountInput(remaining > 0 ? remaining.toFixed(2) : total.toFixed(2))
  }

  function addPayment() {
    const amount = Number.parseFloat(amountInput)
    if (!pendingMethod || !(amount > 0)) return
    setPayments((prev) => [...prev, { method: pendingMethod, amount }])
    setPendingMethod(null)
    setAmountInput('')
  }

  function removePayment(index: number) {
    setPayments((prev) => prev.filter((_, i) => i !== index))
  }

  function confirm() {
    if (remaining > 0) return
    const finalPayments = payments.map((p, i) =>
      i === payments.length - 1 && p.method === 'cash' && change > 0
        ? { ...p, change_given: change }
        : p,
    )
    onConfirm(finalPayments)
  }

  function handleClose() {
    setPayments([])
    setPendingMethod(null)
    setAmountInput('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Cobrar">
      <div className="flex flex-col gap-4">
        <div className="bg-carbon-50 dark:bg-carbon-800 rounded-xl p-4 text-center">
          <p className="text-carbon-500 dark:text-carbon-400 text-sm">Total a cobrar</p>
          <p className="text-carbon-900 dark:text-paper text-3xl font-bold">${total.toFixed(2)}</p>
        </div>

        {payments.length > 0 && (
          <ul className="flex flex-col gap-2">
            {payments.map((p, i) => (
              <li
                key={i}
                className="bg-carbon-50 dark:bg-carbon-800 flex items-center justify-between rounded-lg px-3 py-2 text-sm"
              >
                <span>{METHOD_LABELS[p.method]}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">${p.amount.toFixed(2)}</span>
                  <button
                    type="button"
                    onClick={() => removePayment(i)}
                    aria-label="Quitar pago"
                    className="text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {pendingMethod ? (
          <div className="flex flex-col gap-3">
            <p className="text-carbon-700 dark:text-carbon-300 text-sm font-medium">
              Monto en {METHOD_LABELS[pendingMethod]}
            </p>
            {EXTERNAL_PAYMENT_HINTS[pendingMethod] && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                ℹ️ {EXTERNAL_PAYMENT_HINTS[pendingMethod]}
              </p>
            )}
            <input
              type="number"
              inputMode="decimal"
              autoFocus
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              className="border-carbon-200 text-carbon-900 focus:border-brand-500 focus:ring-brand-500/30 dark:border-carbon-700 dark:bg-carbon-900 dark:text-paper rounded-xl border bg-white px-4 py-3 text-center text-2xl outline-none focus:ring-2"
            />
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setPendingMethod(null)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={addPayment}>
                Agregar
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => openMethod('cash')}>
              💵 Efectivo
            </Button>
            <Button variant="secondary" disabled={!isOnline} onClick={() => openMethod('card')}>
              💳 Tarjeta{!isOnline && ' (requiere conexión)'}
            </Button>
            <Button variant="secondary" onClick={() => openMethod('transfer')}>
              📲 Transferencia
            </Button>
            <Button
              variant="secondary"
              disabled={!hasCustomer}
              onClick={() => openMethod('credit')}
            >
              📒 Fiado
            </Button>
          </div>
        )}

        {remaining > 0 && payments.length > 0 && (
          <p className="text-center text-sm text-amber-600 dark:text-amber-400">
            Faltan ${remaining.toFixed(2)}
          </p>
        )}
        {remaining === 0 && change > 0 && (
          <p className="text-center text-lg font-semibold text-emerald-600 dark:text-emerald-400">
            Cambio: ${change.toFixed(2)}
          </p>
        )}
        {error && (
          <p role="alert" className="text-center text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <Button
          onClick={confirm}
          disabled={remaining > 0 || submitting}
          loading={submitting}
          className="w-full"
        >
          Confirmar cobro
        </Button>
      </div>
    </Modal>
  )
}
