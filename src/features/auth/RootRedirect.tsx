import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'
import { useDeviceStore } from '../../store/useDeviceStore'
import { isPlatformAdmin } from '../admin/api'
import { useCurrentMember } from './useCurrentMember'
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
  const memberQuery = useCurrentMember()

  if (!initialized || (session && (adminQuery.isLoading || memberQuery.isLoading))) return null

  // Una sesión de la tienda demo compartida no cuenta como "ya tiene
  // cuenta" — si no, cualquiera que haya probado la demo en este
  // navegador vería el POS de la demo en vez del landing/registro la
  // próxima vez que entre a spiderpos.netlify.app.
  const isDemoSession = memberQuery.data?.stores?.is_demo === true

  if (session && !isDemoSession) {
    return <Navigate to={adminQuery.data ? '/admin' : '/backoffice'} replace />
  }
  if (boundStoreId) return <Navigate to="/pin" replace />
  return <LandingPage />
}
