import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Logo } from '../../../components/Logo'
import { PageTransition } from '../../../components/PageTransition'
import { ConnectionStatus } from '../../../components/ConnectionStatus'
import { ThemeToggle } from '../../../components/ThemeToggle'
import { SoundToggle } from '../../../components/SoundToggle'
import { FullscreenToggle } from '../../../components/FullscreenToggle'
import { Modal } from '../../../components/ui/Modal'
import { InstallAppModal } from '../../../components/InstallAppModal'
import { useInstallPrompt } from '../../../lib/useInstallPrompt'
import { useCurrentMember } from '../../auth/useCurrentMember'
import { signOut } from '../../auth/api'
import { useOfflineSync } from '../../pos/useOfflineSync'
import { NotificationCenter } from '../../notifications/NotificationCenter'
import { DemoBanner } from '../../marketing/DemoBanner'
import { OnboardingChecklist } from '../OnboardingChecklist'

// La barra inferior móvil solo alcanza para ~5 accesos directos; el resto
// vive detrás de "Más". El sidebar de escritorio muestra todo siempre.
const PRIMARY_NAV = [
  { to: '/backoffice/venta', label: 'Venta', icon: '🛒' },
  { to: '/backoffice/caja', label: 'Caja', icon: '💵' },
  { to: '/backoffice/inventario', label: 'Inventario', icon: '📦' },
  { to: '/backoffice/clientes', label: 'Clientes', icon: '🧑‍🤝‍🧑' },
]

const SECONDARY_NAV = [
  { to: '/backoffice/ventas', label: 'Ventas', icon: '🧾' },
  { to: '/backoffice/reportes', label: 'Reportes', icon: '📊' },
  { to: '/backoffice/promociones', label: 'Promociones', icon: '🏷️' },
  { to: '/backoffice/auditoria', label: 'Auditoría', icon: '🕵️' },
  { to: '/backoffice/suscripcion', label: 'Suscripción', icon: '💳' },
  { to: '/backoffice/perfil', label: 'Perfil', icon: '🏪' },
  { to: '/backoffice/personal', label: 'Personal', icon: '👥' },
]

const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV]

export function BackofficeLayout() {
  const { data: member } = useCurrentMember()
  const [moreOpen, setMoreOpen] = useState(false)
  const [installOpen, setInstallOpen] = useState(false)
  const { installed } = useInstallPrompt()
  const location = useLocation()
  useOfflineSync(member?.store_id)

  return (
    <div className="bg-paper dark:bg-carbon-950 flex min-h-dvh flex-col">
      {member?.stores?.is_demo && <DemoBanner />}
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="border-carbon-200 dark:border-carbon-800 dark:bg-carbon-900 hidden w-64 shrink-0 flex-col border-r bg-white p-4 md:flex">
          <div className="flex items-center gap-2 px-2 py-3">
            <Logo className="h-9 w-9" />
            <span className="text-carbon-900 dark:text-paper font-bold">
              Spider<span className="text-brand-600 dark:text-brand-400">POS</span>
            </span>
          </div>
          <nav className="mt-6 flex flex-col gap-1">
            {ALL_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                      : 'text-carbon-600 hover:bg-carbon-100 dark:text-carbon-300 dark:hover:bg-carbon-800'
                  }`
                }
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
          {!installed && (
            <button
              type="button"
              onClick={() => setInstallOpen(true)}
              className="text-carbon-500 hover:bg-carbon-100 dark:text-carbon-400 dark:hover:bg-carbon-800 mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium"
            >
              <span aria-hidden="true">📲</span>
              Instalar app
            </button>
          )}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-carbon-200 dark:border-carbon-800 dark:bg-carbon-900 flex items-center justify-between border-b bg-white px-4 py-3">
            <div className="flex items-center gap-2 md:hidden">
              <Logo className="h-8 w-8" />
              <span className="text-carbon-900 dark:text-paper font-bold">
                Spider<span className="text-brand-600 dark:text-brand-400">POS</span>
              </span>
            </div>
            <div className="text-carbon-500 dark:text-carbon-400 hidden text-sm md:block">
              {member?.stores?.name}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3">
              <NotificationCenter storeId={member?.store_id} />
              <ConnectionStatus />
              <SoundToggle />
              <FullscreenToggle />
              <ThemeToggle />
              <div className="hidden text-right text-sm md:block">
                <p className="text-carbon-800 dark:text-carbon-100 font-medium">
                  {member?.full_name}
                </p>
                <p className="text-carbon-400 text-xs capitalize">{member?.role}</p>
              </div>
              <button
                type="button"
                onClick={() => signOut()}
                className="text-carbon-500 hover:bg-carbon-100 dark:text-carbon-400 dark:hover:bg-carbon-800 min-h-11 shrink-0 rounded-xl px-2 text-sm font-medium sm:px-3"
              >
                Salir
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4">
            {member?.role === 'owner' && !member.stores?.is_demo && member.store_id && (
              <OnboardingChecklist
                storeId={member.store_id}
                hasLogo={!!member.stores?.logo_url}
                hasTaxData={
                  !!member.stores?.tax_data && Object.keys(member.stores.tax_data).length > 0
                }
              />
            )}
            <PageTransition pageKey={location.pathname}>
              <Outlet />
            </PageTransition>
          </main>

          <nav className="border-carbon-200 dark:border-carbon-800 dark:bg-carbon-900 fixed inset-x-0 bottom-0 z-10 flex border-t bg-white md:hidden">
            {PRIMARY_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                    isActive
                      ? 'text-brand-600 dark:text-brand-400'
                      : 'text-carbon-500 dark:text-carbon-400'
                  }`
                }
              >
                <span className="text-lg" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="text-carbon-500 dark:text-carbon-400 flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium"
            >
              <span className="text-lg" aria-hidden="true">
                ⋯
              </span>
              Más
            </button>
          </nav>
        </div>
      </div>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="Más opciones">
        <div className="grid grid-cols-2 gap-2">
          {SECONDARY_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMoreOpen(false)}
              className="border-carbon-200 text-carbon-700 hover:bg-carbon-50 dark:border-carbon-700 dark:text-carbon-200 dark:hover:bg-carbon-800 flex flex-col items-center gap-1 rounded-xl border p-4 text-sm font-medium"
            >
              <span className="text-2xl" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
          {!installed && (
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false)
                setInstallOpen(true)
              }}
              className="border-carbon-200 text-carbon-700 hover:bg-carbon-50 dark:border-carbon-700 dark:text-carbon-200 dark:hover:bg-carbon-800 flex flex-col items-center gap-1 rounded-xl border p-4 text-sm font-medium"
            >
              <span className="text-2xl" aria-hidden="true">
                📲
              </span>
              Instalar app
            </button>
          )}
        </div>
      </Modal>

      <InstallAppModal open={installOpen} onClose={() => setInstallOpen(false)} />
    </div>
  )
}
