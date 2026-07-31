import { NavLink, Outlet } from 'react-router-dom'
import { Logo } from '../../../components/Logo'
import { ConnectionStatus } from '../../../components/ConnectionStatus'
import { ThemeToggle } from '../../../components/ThemeToggle'
import { useCurrentMember } from '../../auth/useCurrentMember'
import { signOut } from '../../auth/api'

const NAV_ITEMS = [
  { to: '/backoffice/venta', label: 'Venta', icon: '🛒' },
  { to: '/backoffice/ventas', label: 'Ventas', icon: '🧾' },
  { to: '/backoffice/perfil', label: 'Perfil', icon: '🏪' },
  { to: '/backoffice/personal', label: 'Personal', icon: '👥' },
]

export function BackofficeLayout() {
  const { data: member } = useCurrentMember()

  return (
    <div className="bg-paper dark:bg-carbon-950 flex min-h-dvh flex-col md:flex-row">
      <aside className="border-carbon-200 dark:border-carbon-800 dark:bg-carbon-900 hidden w-64 shrink-0 flex-col border-r bg-white p-4 md:flex">
        <div className="flex items-center gap-2 px-2 py-3">
          <Logo className="h-9 w-9" />
          <span className="text-carbon-900 dark:text-paper font-bold">
            Spider<span className="text-brand-600 dark:text-brand-400">POS</span>
          </span>
        </div>
        <nav className="mt-6 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
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
      </aside>

      <div className="flex flex-1 flex-col">
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
            <ConnectionStatus />
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
          <Outlet />
        </main>

        <nav className="border-carbon-200 dark:border-carbon-800 dark:bg-carbon-900 fixed inset-x-0 bottom-0 z-10 flex border-t bg-white md:hidden">
          {NAV_ITEMS.map((item) => (
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
        </nav>
      </div>
    </div>
  )
}
