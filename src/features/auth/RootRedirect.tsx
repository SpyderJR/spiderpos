import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'
import { useDeviceStore } from '../../store/useDeviceStore'
import { isPlatformAdmin } from '../admin/api'
import { LandingPage } from '../marketing/LandingPage'

export function RootRedirect() {
  const session = useAuthStore((state) => state.session)
  const initialized = useAuthStore((state) => state.initialized)
  const boundStoreId = useDeviceStore((state) => state.boundStoreId)

  const adminQuery = useQuery({
    queryKey: ['is-platform-admin', session?.user.id],
    queryFn: isPlatformAdmin,
    enabled: !!session,
  })

  if (!initialized || (session && adminQuery.isLoading)) return null

  if (session) return <Navigate to={adminQuery.data ? '/admin' : '/backoffice'} replace />
  if (boundStoreId) return <Navigate to="/pin" replace />
  return <LandingPage />
}
