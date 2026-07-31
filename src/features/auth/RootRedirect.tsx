import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'
import { useDeviceStore } from '../../store/useDeviceStore'

export function RootRedirect() {
  const session = useAuthStore((state) => state.session)
  const initialized = useAuthStore((state) => state.initialized)
  const boundStoreId = useDeviceStore((state) => state.boundStoreId)

  if (!initialized) return null

  if (session) return <Navigate to="/backoffice" replace />
  if (boundStoreId) return <Navigate to="/pin" replace />
  return <Navigate to="/login" replace />
}
