import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useCurrentMember } from '../auth/useCurrentMember'
import { Modal } from '../../components/ui/Modal'
import { listSales, fetchReceiptData } from './api'
import { ReceiptActions } from './ReceiptActions'
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

export function SalesHistoryPage() {
  const { data: member } = useCurrentMember()
  const storeId = member?.store_id
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)

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

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-carbon-900 dark:text-paper text-2xl font-bold">Ventas</h1>

      {salesQuery.isLoading && <p className="text-carbon-500 dark:text-carbon-400">Cargando...</p>}
      {salesQuery.data?.length === 0 && (
        <p className="text-carbon-400 text-center text-sm">Todavía no hay ventas registradas.</p>
      )}

      <ul className="flex flex-col gap-2">
        {salesQuery.data?.map((sale) => (
          <li key={sale.id}>
            <button
              type="button"
              onClick={() => setSelectedSaleId(sale.id)}
              className="border-carbon-200 hover:border-brand-400 dark:border-carbon-800 dark:bg-carbon-900 flex w-full items-center justify-between rounded-xl border bg-white p-4 text-left"
            >
              <div>
                <p className="text-carbon-900 dark:text-paper font-medium">
                  {sale.id.slice(0, 8).toUpperCase()}
                </p>
                <p className="text-carbon-500 dark:text-carbon-400 text-sm">
                  {new Date(sale.clientCreatedAt).toLocaleString('es-MX')} · {sale.cashierName}
                </p>
                <p className="text-carbon-400 text-xs">
                  {sale.paymentMethods.map((m) => METHOD_LABELS[m] ?? m).join(' + ')} ·{' '}
                  {STATUS_LABELS[sale.status] ?? sale.status}
                </p>
              </div>
              <p className="text-carbon-900 dark:text-paper text-lg font-bold">
                ${sale.total.toFixed(2)}
              </p>
            </button>
          </li>
        ))}
      </ul>

      <Modal
        open={!!selectedSaleId}
        onClose={() => setSelectedSaleId(null)}
        title="Detalle de venta"
      >
        {receiptQuery.isLoading && (
          <p className="text-carbon-500 dark:text-carbon-400">Cargando...</p>
        )}
        {receiptQuery.data && (
          <div className="flex flex-col gap-4">
            <div>
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
                    <span>${item.subtotal.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="border-carbon-100 text-carbon-900 dark:border-carbon-800 dark:text-paper mt-2 flex justify-between border-t pt-2 font-bold">
                <span>Total</span>
                <span>${receiptQuery.data.total.toFixed(2)}</span>
              </div>
            </div>
            <ReceiptActions data={receiptQuery.data} />
          </div>
        )}
      </Modal>
    </div>
  )
}
