import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'
import { useDeviceStore } from '../../store/useDeviceStore'
import { useCurrentMember } from './useCurrentMember'
import { signOut } from './api'

export function ProtectedRoute() {
  const session = useAuthStore((state) => state.session)
  const initialized = useAuthStore((state) => state.initialized)
  const bindStore = useDeviceStore((state) => state.bindStore)
  const boundStoreId = useDeviceStore((state) => state.boundStoreId)
  const memberQuery = useCurrentMember()

  useEffect(() => {
    if (memberQuery.data?.store_id) {
      bindStore(memberQuery.data.store_id)
    }
  }, [memberQuery.data?.store_id, bindStore])

  if (!initialized || (session && memberQuery.isLoading)) {
    return (
      <div className="bg-paper dark:bg-carbon-950 flex min-h-dvh items-center justify-center">
        <span
          className="border-brand-500 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
          aria-label="Cargando"
        />
      </div>
    )
  }

  if (!session) {
    return <Navigate to={boundStoreId ? '/pin' : '/login'} replace />
  }

  if (memberQuery.isError || !memberQuery.data) {
    return (
      <div className="bg-paper dark:bg-carbon-950 flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-carbon-700 dark:text-carbon-300">
          Tu cuenta no está vinculada a ninguna tienda todavía.
        </p>
        <button
          type="button"
          onClick={() => signOut()}
          className="text-brand-600 dark:text-brand-400 text-sm hover:underline"
        >
          Cerrar sesión
        </button>
      </div>
    )
  }

  return <Outlet />
}
