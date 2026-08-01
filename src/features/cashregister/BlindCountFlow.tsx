import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { playTap } from '../../lib/sound'

interface Denomination {
  value: number
  label: string
  kind: 'bill' | 'coin'
}

const DENOMINATIONS: Denomination[] = [
  { value: 1000, label: '$1,000', kind: 'bill' },
  { value: 500, label: '$500', kind: 'bill' },
  { value: 200, label: '$200', kind: 'bill' },
  { value: 100, label: '$100', kind: 'bill' },
  { value: 50, label: '$50', kind: 'bill' },
  { value: 20, label: '$20', kind: 'bill' },
  { value: 10, label: '$10', kind: 'coin' },
  { value: 5, label: '$5', kind: 'coin' },
  { value: 2, label: '$2', kind: 'coin' },
  { value: 1, label: '$1', kind: 'coin' },
  { value: 0.5, label: '$0.50', kind: 'coin' },
]

interface BlindCountFlowProps {
  onComplete: (total: number) => void
  onCancel: () => void
}

export function BlindCountFlow({ onComplete, onCancel }: BlindCountFlowProps) {
  const [counts, setCounts] = useState<Record<number, number>>({})
  const [step, setStep] = useState(0)
  const [reviewing, setReviewing] = useState(false)

  const denom = DENOMINATIONS[step] ?? DENOMINATIONS[0]!
  const runningTotal = DENOMINATIONS.reduce((sum, d) => sum + d.value * (counts[d.value] ?? 0), 0)

  function setCount(value: number) {
    setCounts((prev) => ({ ...prev, [denom.value]: value }))
  }

  function next() {
    playTap()
    if (step < DENOMINATIONS.length - 1) {
      setStep(step + 1)
    } else {
      setReviewing(true)
    }
  }

  function back() {
    playTap()
    if (reviewing) {
      setReviewing(false)
    } else if (step > 0) {
      setStep(step - 1)
    } else {
      onCancel()
    }
  }

  if (reviewing) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-carbon-500 dark:text-carbon-400 text-sm">
          Revisa el conteo antes de confirmar — no podrás verlo después sin volver a contar.
        </p>
        <ul className="divide-carbon-100 dark:divide-carbon-800 flex max-h-64 flex-col divide-y overflow-y-auto">
          {DENOMINATIONS.filter((d) => (counts[d.value] ?? 0) > 0).map((d) => (
            <li key={d.value} className="flex items-center justify-between py-2 text-sm">
              <span className="text-carbon-600 dark:text-carbon-300">
                {d.label} × {counts[d.value]}
              </span>
              <span className="font-semibold tabular-nums">
                ${(d.value * (counts[d.value] ?? 0)).toFixed(2)}
              </span>
            </li>
          ))}
          {DENOMINATIONS.every((d) => !((counts[d.value] ?? 0) > 0)) && (
            <li className="text-carbon-400 py-4 text-center text-sm">Sin efectivo contado</li>
          )}
        </ul>
        <div className="border-carbon-100 dark:border-carbon-800 flex items-center justify-between border-t pt-3 text-xl font-bold tabular-nums">
          <span className="text-carbon-900 dark:text-paper">Total contado</span>
          <span className="text-carbon-900 dark:text-paper">${runningTotal.toFixed(2)}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={back} className="flex-1">
            Corregir
          </Button>
          <Button onClick={() => onComplete(runningTotal)} className="flex-[2]">
            Confirmar conteo y cerrar turno
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-carbon-400 text-xs font-medium">
          {step + 1} de {DENOMINATIONS.length}
        </span>
        <div className="flex gap-1">
          {DENOMINATIONS.map((d, i) => (
            <span
              key={d.value}
              className={`h-1.5 w-4 rounded-full ${
                i <= step ? 'bg-brand-600' : 'bg-carbon-200 dark:bg-carbon-700'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 py-2">
        <span className="text-4xl" aria-hidden="true">
          {denom.kind === 'bill' ? '💵' : '🪙'}
        </span>
        <p className="text-carbon-900 dark:text-paper text-3xl font-bold tabular-nums">
          {denom.label}
        </p>
        <p className="text-carbon-400 text-sm">¿Cuántas piezas hay?</p>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          autoFocus
          value={counts[denom.value] ?? ''}
          onChange={(e) => setCount(Math.max(0, Number.parseInt(e.target.value, 10) || 0))}
          onKeyDown={(e) => e.key === 'Enter' && next()}
          placeholder="0"
          className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 focus:border-brand-500 w-full rounded-xl border px-4 py-4 text-center text-3xl font-bold tabular-nums outline-none"
        />
        {(counts[denom.value] ?? 0) > 0 && (
          <p className="text-brand-600 dark:text-brand-400 text-sm font-semibold tabular-nums">
            = ${(denom.value * (counts[denom.value] ?? 0)).toFixed(2)}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={back} className="flex-1">
          {step === 0 ? 'Cancelar' : 'Atrás'}
        </Button>
        <Button onClick={next} className="flex-[2]">
          {step === DENOMINATIONS.length - 1 ? 'Revisar total' : 'Siguiente'}
        </Button>
      </div>
    </div>
  )
}
