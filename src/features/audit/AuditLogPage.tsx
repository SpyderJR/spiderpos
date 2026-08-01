import { useQuery } from '@tanstack/react-query'
import { useCurrentMember } from '../auth/useCurrentMember'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { SkeletonList } from '../../components/ui/Skeleton'
import { listAuditLog } from './api'

const ACTION_LABELS: Record<string, string> = {
  'sale.created': 'Venta registrada',
  'sale.cancelled': 'Venta cancelada',
  'sale.returned': 'Devolución',
  'product.stock_adjusted': 'Ajuste de stock',
  'purchase_order.received': 'Compra recibida',
  'customer.payment_recorded': 'Abono registrado',
  'cash_shift.opened': 'Turno abierto',
  'cash_shift.closed': 'Turno cerrado',
}

export function AuditLogPage() {
  const { data: member } = useCurrentMember()
  const storeId = member?.store_id
  const isAuthorized = member?.role === 'owner' || member?.role === 'manager'

  const auditQuery = useQuery({
    queryKey: ['audit-log', storeId],
    queryFn: () => listAuditLog(storeId!),
    enabled: !!storeId && isAuthorized,
  })

  if (!storeId) return null

  if (!isAuthorized) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="bg-carbon-100 text-carbon-600 dark:bg-carbon-800 dark:text-carbon-300 rounded-xl p-4 text-center text-sm">
          Solo el dueño o gerentes pueden ver la bitácora de auditoría.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-carbon-900 dark:text-paper text-2xl font-bold">Bitácora de auditoría</h1>
      <p className="text-carbon-500 dark:text-carbon-400 text-sm">
        Registro inmutable de acciones sensibles: ventas canceladas, devoluciones, ajustes de stock,
        cortes de caja y abonos.
      </p>

      {auditQuery.isLoading ? (
        <SkeletonList />
      ) : auditQuery.data?.length === 0 ? (
        <EmptyState icon="🕵️" title="Sin actividad registrada todavía" />
      ) : (
        <ul className="flex flex-col gap-2">
          {auditQuery.data?.map((entry) => (
            <Card key={entry.id} className="p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-carbon-900 dark:text-paper font-medium">
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </span>
                <span className="text-carbon-400 text-xs">
                  {new Date(entry.createdAt).toLocaleString('es-MX')}
                </span>
              </div>
              <p className="text-carbon-500 dark:text-carbon-400">{entry.employeeName}</p>
              {Object.keys(entry.metadata).length > 0 && (
                <p className="text-carbon-400 mt-1 truncate text-xs">
                  {JSON.stringify(entry.metadata)}
                </p>
              )}
            </Card>
          ))}
        </ul>
      )}
    </div>
  )
}
