import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { fetchChecklistStatus, type ChecklistStatus } from './api'
import { playConfirm } from '../../lib/sound'

const DISMISS_KEY_PREFIX = 'spiderpos-onboarding-dismissed-'

interface OnboardingChecklistProps {
  storeId: string
  logoUrl: string | null
  taxData: Record<string, unknown> | null
  payoutClabe: string | null
}

interface ChecklistItem {
  key: keyof ChecklistStatus
  label: string
  href: string
}

const ITEMS: ChecklistItem[] = [
  { key: 'hasLogo', label: 'Sube el logo de tu negocio', href: '/backoffice/perfil' },
  { key: 'hasProduct', label: 'Da de alta tu primer producto', href: '/backoffice/inventario' },
  { key: 'hasStaffWithPin', label: 'Agrega un empleado con su PIN', href: '/backoffice/personal' },
  { key: 'hasPrinter', label: 'Conecta tu impresora de tickets', href: '/backoffice/perfil' },
  {
    key: 'hasPayout',
    label: 'Configura dónde recibir tus cobros',
    href: '/backoffice/suscripcion',
  },
  { key: 'hasSale', label: 'Haz tu primera venta', href: '/backoffice/venta' },
]

export function OnboardingChecklist({
  storeId,
  logoUrl,
  taxData,
  payoutClabe,
}: OnboardingChecklistProps) {
  const dismissKey = `${DISMISS_KEY_PREFIX}${storeId}`
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(dismissKey) === '1')
  const celebratedRef = useRef(false)

  const { data: status } = useQuery({
    queryKey: ['onboarding-checklist', storeId, logoUrl, payoutClabe],
    queryFn: () => fetchChecklistStatus(storeId, logoUrl, taxData, payoutClabe),
    enabled: !dismissed,
    staleTime: 15_000,
  })

  const doneCount = status ? ITEMS.filter((item) => status[item.key]).length : 0
  const allDone = status && doneCount === ITEMS.length

  useEffect(() => {
    if (allDone && !celebratedRef.current) {
      celebratedRef.current = true
      playConfirm()
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#4f46e5', '#7c3aed', '#818cf8', '#fbbf24'],
      })
    }
  }, [allDone])

  if (dismissed || !status || allDone) return null

  return (
    <div className="border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-950/30 mb-4 rounded-2xl border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-brand-800 dark:text-brand-200 text-sm font-semibold">
            Primeros pasos ({doneCount}/{ITEMS.length})
          </p>
          <div className="bg-brand-200 dark:bg-brand-900 mt-1.5 h-1.5 w-40 overflow-hidden rounded-full">
            <div
              className="bg-brand-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${(doneCount / ITEMS.length) * 100}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(dismissKey, '1')
            setDismissed(true)
          }}
          className="text-brand-600 dark:text-brand-400 text-xs font-medium hover:underline"
        >
          Ocultar
        </button>
      </div>
      <ul className="flex flex-col gap-1.5">
        {ITEMS.map((item) => {
          const done = status[item.key]
          return (
            <li key={item.key}>
              <Link
                to={item.href}
                className={`flex items-center gap-2 text-sm ${
                  done
                    ? 'text-brand-700/60 dark:text-brand-300/50 line-through'
                    : 'text-brand-700 dark:text-brand-300 hover:underline'
                }`}
              >
                <span aria-hidden="true">{done ? '✅' : '⬜'}</span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
