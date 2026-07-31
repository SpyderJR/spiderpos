import { useState } from 'react'
import { Link } from 'react-router-dom'

const DISMISS_KEY_PREFIX = 'spiderpos-onboarding-dismissed-'

interface OnboardingChecklistProps {
  storeId: string
  hasLogo: boolean
  hasTaxData: boolean
}

const STEPS = (storeId: string) =>
  [
    { key: 'logo', label: 'Sube el logo de tu negocio', done: false, href: '/backoffice/perfil' },
    { key: 'tax', label: 'Agrega tus datos fiscales', done: false, href: '/backoffice/perfil' },
    {
      key: 'staff',
      label: 'Invita a tu personal (cajeros, gerentes)',
      done: false,
      href: '/backoffice/personal',
    },
  ].map((s) => ({ ...s, storeId }))

export function OnboardingChecklist({ storeId, hasLogo, hasTaxData }: OnboardingChecklistProps) {
  const dismissKey = `${DISMISS_KEY_PREFIX}${storeId}`
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(dismissKey) === '1')

  if (dismissed) return null

  const steps = STEPS(storeId).map((s) => {
    if (s.key === 'logo') return { ...s, done: hasLogo }
    if (s.key === 'tax') return { ...s, done: hasTaxData }
    return s
  })

  if (steps.every((s) => s.done)) return null

  return (
    <div className="border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-950/30 mb-4 rounded-2xl border p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-brand-800 dark:text-brand-200 text-sm font-semibold">
          Termina de configurar tu tienda (opcional)
        </p>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(dismissKey, '1')
            setDismissed(true)
          }}
          className="text-brand-600 dark:text-brand-400 text-xs font-medium hover:underline"
        >
          Saltar por ahora
        </button>
      </div>
      <ul className="flex flex-col gap-1.5">
        {steps.map((s) => (
          <li key={s.key}>
            <Link
              to={s.href}
              className="text-brand-700 dark:text-brand-300 flex items-center gap-2 text-sm hover:underline"
            >
              <span aria-hidden="true">{s.done ? '✅' : '⬜'}</span>
              {s.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
