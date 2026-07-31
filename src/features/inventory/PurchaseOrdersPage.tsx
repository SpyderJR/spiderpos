import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCurrentMember } from '../auth/useCurrentMember'
import { Button } from '../../components/ui/Button'
import { listPurchaseOrders, receivePurchaseOrder } from './api'
import { CreatePurchaseOrderDialog } from './CreatePurchaseOrderDialog'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  ordered: 'Ordenada',
  received: 'Recibida',
  cancelled: 'Cancelada',
}

export function PurchaseOrdersPage() {
  const { data: member } = useCurrentMember()
  const storeId = member?.store_id
  const canManage =
    member?.role === 'owner' ||
    member?.role === 'manager' ||
    !!(member?.permissions as Record<string, boolean>)?.manage_inventory

  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)

  const ordersQuery = useQuery({
    queryKey: ['purchase-orders', storeId],
    queryFn: () => listPurchaseOrders(storeId!),
    enabled: !!storeId,
  })

  const receiveMutation = useMutation({
    mutationFn: (id: string) => receivePurchaseOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', storeId] })
      queryClient.invalidateQueries({ queryKey: ['products', storeId] })
      queryClient.invalidateQueries({ queryKey: ['low-stock', storeId] })
    },
  })

  if (!storeId || !member) return null

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-carbon-900 dark:text-paper text-2xl font-bold">Compras</h1>
        {canManage && <Button onClick={() => setCreateOpen(true)}>+ Orden de compra</Button>}
      </div>

      <ul className="flex flex-col gap-2">
        {ordersQuery.data?.map((order) => (
          <li
            key={order.id}
            className="border-carbon-200 dark:border-carbon-800 dark:bg-carbon-900 flex items-center justify-between rounded-xl border bg-white p-4"
          >
            <div>
              <p className="text-carbon-900 dark:text-paper font-medium">
                {order.suppliers?.name ?? 'Sin proveedor'}
              </p>
              <p className="text-carbon-500 dark:text-carbon-400 text-sm">
                {new Date(order.created_at).toLocaleDateString('es-MX')} ·{' '}
                {STATUS_LABELS[order.status]} · ${order.total.toFixed(2)}
              </p>
            </div>
            {canManage && order.status !== 'received' && (
              <Button
                variant="secondary"
                loading={receiveMutation.isPending}
                onClick={() => receiveMutation.mutate(order.id)}
              >
                Recibir
              </Button>
            )}
          </li>
        ))}
        {ordersQuery.data?.length === 0 && (
          <p className="text-carbon-400 text-center text-sm">Todavía no hay órdenes de compra.</p>
        )}
      </ul>

      <CreatePurchaseOrderDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        storeId={storeId}
        employeeId={member.id}
      />
    </div>
  )
}
