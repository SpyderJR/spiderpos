import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { RootRedirect } from './features/auth/RootRedirect'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { Toaster } from './components/ui/Toaster'

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
const FacturasPage = lazy(() =>
  import('./features/invoicing/FacturasPage').then((m) => ({ default: m.FacturasPage })),
)
const SubscriptionPage = lazy(() =>
  import('./features/subscription/SubscriptionPage').then((m) => ({
    default: m.SubscriptionPage,
  })),
)
const SignupPage = lazy(() =>
  import('./features/marketing/SignupPage').then((m) => ({ default: m.SignupPage })),
)
const CheckoutReturnPage = lazy(() =>
  import('./features/marketing/CheckoutReturnPage').then((m) => ({
    default: m.CheckoutReturnPage,
  })),
)
const TermsPage = lazy(() =>
  import('./features/legal/TermsPage').then((m) => ({ default: m.TermsPage })),
)
const PrivacyPage = lazy(() =>
  import('./features/legal/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
)
const RefundPolicyPage = lazy(() =>
  import('./features/legal/RefundPolicyPage').then((m) => ({ default: m.RefundPolicyPage })),
)
const AdminProtectedRoute = lazy(() =>
  import('./features/admin/AdminProtectedRoute').then((m) => ({
    default: m.AdminProtectedRoute,
  })),
)
const AdminLayout = lazy(() =>
  import('./features/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })),
)
const AdminDashboardPage = lazy(() =>
  import('./features/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
)
const AdminTenantsPage = lazy(() =>
  import('./features/admin/AdminTenantsPage').then((m) => ({ default: m.AdminTenantsPage })),
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
      <Toaster />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/pin" element={<PinLoginPage />} />
          <Route path="/registro" element={<SignupPage />} />
          <Route path="/checkout/return" element={<CheckoutReturnPage />} />
          <Route path="/terminos" element={<TermsPage />} />
          <Route path="/privacidad" element={<PrivacyPage />} />
          <Route path="/reembolsos" element={<RefundPolicyPage />} />

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
              <Route path="facturas" element={<FacturasPage />} />
              <Route path="suscripcion" element={<SubscriptionPage />} />
              <Route path="perfil" element={<BusinessProfilePage />} />
              <Route path="personal" element={<StaffPage />} />
            </Route>
          </Route>

          <Route element={<AdminProtectedRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="tenants" element={<AdminTenantsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
