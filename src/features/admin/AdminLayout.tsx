import { NavLink, Outlet } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { signOut } from '../auth/api'

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/tenants', label: 'Tiendas' },
]

export function AdminLayout() {
  return (
    <div className="bg-carbon-950 min-h-dvh">
      <header className="border-carbon-800 flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="text-paper text-sm font-bold">
            Spider<span className="text-brand-400">POS</span>{' '}
            <span className="text-carbon-400 font-normal">· Súper Admin</span>
          </span>
        </div>
        <nav className="flex items-center gap-4">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? 'text-brand-400' : 'text-carbon-400 hover:text-paper'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => signOut()}
            className="text-carbon-400 hover:text-paper text-sm"
          >
            Salir
          </button>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
