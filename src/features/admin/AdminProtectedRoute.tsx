import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'
import { isPlatformAdmin } from './api'

export function AdminProtectedRoute() {
  const session = useAuthStore((state) => state.session)
  const initialized = useAuthStore((state) => state.initialized)

  const adminQuery = useQuery({
    queryKey: ['is-platform-admin', session?.user.id],
    queryFn: isPlatformAdmin,
    enabled: !!session,
  })

  if (!initialized || (session && adminQuery.isLoading)) {
    return (
      <div className="bg-carbon-950 flex min-h-dvh items-center justify-center">
        <span
          className="h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white"
          aria-label="Cargando"
        />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  if (!adminQuery.data) return <Navigate to="/" replace />

  return <Outlet />
}
