import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import type { LocalProduct } from '../../lib/db'

const UNIT_LABELS: Record<LocalProduct['unitType'], string> = {
  piece: 'pieza',
  kg: 'kg',
  g: 'g',
  lt: 'lt',
  m: 'm',
}

interface BulkQuantityModalProps {
  product: LocalProduct | null
  onClose: () => void
  onConfirm: (quantity: number) => void
}

export function BulkQuantityModal({ product, onClose, onConfirm }: BulkQuantityModalProps) {
  const [value, setValue] = useState('')

  if (!product) return null

  const quantity = Number.parseFloat(value || '0')
  const total = quantity * product.price

  function press(key: string) {
    if (key === '⌫') {
      setValue((prev) => prev.slice(0, -1))
      return
    }
    if (key === '.' && value.includes('.')) return
    setValue((prev) => (prev.length < 8 ? prev + key : prev))
  }

  function confirm() {
    if (quantity > 0) {
      onConfirm(quantity)
      setValue('')
    }
  }

  return (
    <Modal open={!!product} onClose={onClose} title={product.name}>
      <div className="flex flex-col items-center gap-4">
        <p className="text-carbon-500 dark:text-carbon-400 text-sm">
          ${product.price.toFixed(2)} por {UNIT_LABELS[product.unitType]}
        </p>
        <div className="text-carbon-900 dark:text-paper text-4xl font-bold">
          {value || '0'}{' '}
          <span className="text-carbon-400 text-lg">{UNIT_LABELS[product.unitType]}</span>
        </div>
        <p className="text-brand-600 dark:text-brand-400 text-lg font-medium">
          Total: ${total.toFixed(2)}
        </p>

        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => press(key)}
              className="bg-carbon-100 text-carbon-800 hover:bg-carbon-200 dark:bg-carbon-800 dark:text-carbon-100 dark:hover:bg-carbon-700 flex h-14 w-16 items-center justify-center rounded-xl text-xl font-semibold"
            >
              {key}
            </button>
          ))}
        </div>

        <Button onClick={confirm} disabled={quantity <= 0} className="w-full">
          Agregar al carrito
        </Button>
      </div>
    </Modal>
  )
}
