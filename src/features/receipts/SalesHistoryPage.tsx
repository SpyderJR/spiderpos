import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useCurrentMember } from '../auth/useCurrentMember'
import { Drawer } from '../../components/ui/Drawer'
import { Card } from '../../components/ui/Card'
import { Badge, type BadgeTone } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { SkeletonList } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/Button'
import { listSales, fetchReceiptData } from './api'
import { ReceiptActions } from './ReceiptActions'
import { ReturnDialog } from './ReturnDialog'
import { CancelSaleDialog } from './CancelSaleDialog'
import { InvoiceSection } from '../invoicing/InvoiceSection'
import type { ReceiptData } from './types'

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  credit: 'Fiado',
}

const STATUS_LABELS: Record<string, string> = {
  completed: 'Completada',
  parked: 'En espera',
  cancelled: 'Cancelada',
  returned: 'Devuelta',
  partially_returned: 'Devuelta parcial',
}

const STATUS_TONES: Record<string, BadgeTone> = {
  completed: 'success',
  parked: 'info',
  cancelled: 'critical',
  returned: 'warning',
  partially_returned: 'warning',
}

export function SalesHistoryPage() {
  const { data: member } = useCurrentMember()
  const storeId = member?.store_id
  const canProcessReturns =
    member?.role === 'owner' ||
    member?.role === 'manager' ||
    !!(member?.permissions as Record<string, boolean>)?.process_returns
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
  const [returnSaleId, setReturnSaleId] = useState<string | null>(null)
  const [cancelSaleId, setCancelSaleId] = useState<string | null>(null)

  const salesQuery = useQuery({
    queryKey: ['sales', storeId],
    queryFn: () => listSales(storeId!),
    enabled: !!storeId,
  })

  const receiptQuery = useQuery({
    queryKey: ['receipt', selectedSaleId],
    queryFn: async (): Promise<ReceiptData> => {
      const data = await fetchReceiptData(selectedSaleId!)
      return { ...data, isCopy: true }
    },
    enabled: !!selectedSaleId,
  })

  if (!storeId) return null

  const activeSale = salesQuery.data?.find((s) => s.id === selectedSaleId)
  const canModify =
    activeSale && activeSale.status !== 'cancelled' && activeSale.status !== 'returned'

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-carbon-900 dark:text-paper text-2xl font-bold">Ventas</h1>

      {salesQuery.isLoading && <SkeletonList />}
      {salesQuery.data?.length === 0 && (
        <EmptyState
          icon="🧾"
          title="Sin ventas todavía"
          description="Aquí verás cada venta registrada."
        />
      )}

      <ul className="flex flex-col gap-2">
        {salesQuery.data?.map((sale) => (
          <li key={sale.id}>
            <Card
              className="hover:border-brand-400 flex w-full cursor-pointer items-center justify-between p-4 text-left transition-colors"
              onClick={() => setSelectedSaleId(sale.id)}
            >
              <div>
                <p className="text-carbon-900 dark:text-paper font-medium">
                  {sale.id.slice(0, 8).toUpperCase()}
                </p>
                <p className="text-carbon-500 dark:text-carbon-400 text-sm">
                  {new Date(sale.clientCreatedAt).toLocaleString('es-MX')} · {sale.cashierName}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-carbon-400 text-xs">
                    {sale.paymentMethods.map((m) => METHOD_LABELS[m] ?? m).join(' + ')}
                  </span>
                  <Badge tone={STATUS_TONES[sale.status] ?? 'neutral'}>
                    {STATUS_LABELS[sale.status] ?? sale.status}
                  </Badge>
                </div>
              </div>
              <p className="text-carbon-900 dark:text-paper text-lg font-bold tabular-nums">
                ${sale.total.toFixed(2)}
              </p>
            </Card>
          </li>
        ))}
      </ul>

      <Drawer
        open={!!selectedSaleId}
        onClose={() => setSelectedSaleId(null)}
        title="Detalle de venta"
      >
        {receiptQuery.isLoading && (
          <p className="text-carbon-500 dark:text-carbon-400">Cargando...</p>
        )}
        {receiptQuery.data && (
          <div className="flex flex-col gap-4">
            <Card className="p-4">
              <p className="text-carbon-500 dark:text-carbon-400 text-sm">
                Folio {receiptQuery.data.folio} ·{' '}
                {new Date(receiptQuery.data.createdAt).toLocaleString('es-MX')}
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {receiptQuery.data.items.map((item, i) => (
                  <li key={i} className="text-carbon-700 dark:text-carbon-300 flex justify-between">
                    <span>
                      {item.quantity} x {item.name}
                    </span>
                    <span className="tabular-nums">${item.subtotal.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="border-carbon-100 text-carbon-900 dark:border-carbon-800 dark:text-paper mt-2 flex justify-between border-t pt-2 text-lg font-bold tabular-nums">
                <span>Total</span>
                <span>${receiptQuery.data.total.toFixed(2)}</span>
              </div>
            </Card>
            <ReceiptActions data={receiptQuery.data} />

            {activeSale?.status === 'completed' && (
              <InvoiceSection
                saleId={activeSale.id}
                canCancel={member?.role === 'owner' || member?.role === 'manager'}
              />
            )}

            {canModify && canProcessReturns && (
              <div className="border-carbon-100 dark:border-carbon-800 flex gap-2 border-t pt-4">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setReturnSaleId(selectedSaleId)
                    setSelectedSaleId(null)
                  }}
                >
                  Devolver
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => {
                    setCancelSaleId(selectedSaleId)
                    setSelectedSaleId(null)
                  }}
                >
                  Cancelar venta
                </Button>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <ReturnDialog
        saleId={returnSaleId}
        onClose={() => {
          setReturnSaleId(null)
          setSelectedSaleId(null)
        }}
      />
      <CancelSaleDialog
        saleId={cancelSaleId}
        onClose={() => {
          setCancelSaleId(null)
          setSelectedSaleId(null)
        }}
      />
    </div>
  )
}
