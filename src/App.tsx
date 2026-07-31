import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { RootRedirect } from './features/auth/RootRedirect'
import { ProtectedRoute } from './features/auth/ProtectedRoute'

const LoginPage = lazy(() =>
  import('./features/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const PinLoginPage = lazy(() =>
  import('./features/auth/PinLoginPage').then((m) => ({ default: m.PinLoginPage })),
)
const BackofficeLayout = lazy(() =>
  import('./features/backoffice/layout/BackofficeLayout').then((m) => ({
    default: m.BackofficeLayout,
  })),
)
const BusinessProfilePage = lazy(() =>
  import('./features/backoffice/profile/BusinessProfilePage').then((m) => ({
    default: m.BusinessProfilePage,
  })),
)
const StaffPage = lazy(() =>
  import('./features/backoffice/staff/StaffPage').then((m) => ({ default: m.StaffPage })),
)
const POSPage = lazy(() => import('./features/pos/POSPage').then((m) => ({ default: m.POSPage })))
const SalesHistoryPage = lazy(() =>
  import('./features/receipts/SalesHistoryPage').then((m) => ({ default: m.SalesHistoryPage })),
)
const InventoryPage = lazy(() =>
  import('./features/inventory/InventoryPage').then((m) => ({ default: m.InventoryPage })),
)
const CustomersPage = lazy(() =>
  import('./features/customers/CustomersPage').then((m) => ({ default: m.CustomersPage })),
)
const CashRegisterPage = lazy(() =>
  import('./features/cashregister/CashRegisterPage').then((m) => ({ default: m.CashRegisterPage })),
)
const ReportsPage = lazy(() =>
  import('./features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })),
)
const PromotionsPage = lazy(() =>
  import('./features/promotions/PromotionsPage').then((m) => ({ default: m.PromotionsPage })),
)
const AuditLogPage = lazy(() =>
  import('./features/audit/AuditLogPage').then((m) => ({ default: m.AuditLogPage })),
)

function RouteFallback() {
  return (
    <div className="bg-paper dark:bg-carbon-950 flex min-h-dvh items-center justify-center">
      <span
        className="border-brand-500 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
        aria-label="Cargando"
      />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/pin" element={<PinLoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/backoffice" element={<BackofficeLayout />}>
              <Route index element={<Navigate to="venta" replace />} />
              <Route path="venta" element={<POSPage />} />
              <Route path="ventas" element={<SalesHistoryPage />} />
              <Route path="inventario" element={<InventoryPage />} />
              <Route path="clientes" element={<CustomersPage />} />
              <Route path="caja" element={<CashRegisterPage />} />
              <Route path="reportes" element={<ReportsPage />} />
              <Route path="promociones" element={<PromotionsPage />} />
              <Route path="auditoria" element={<AuditLogPage />} />
              <Route path="perfil" element={<BusinessProfilePage />} />
              <Route path="personal" element={<StaffPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
