import { useQuery } from '@tanstack/react-query'
import { useCurrentMember } from '../auth/useCurrentMember'
import { Card } from '../../components/ui/Card'
import { Badge, type BadgeTone } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { SkeletonList } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/Button'
import { listInvoices, downloadInvoiceFile } from './api'
import { toast } from '../../store/useToastStore'

const STATUS_LABELS: Record<string, string> = {
  stamped: 'Timbrada',
  error: 'Con error',
  cancelled: 'Cancelada',
}

const STATUS_TONES: Record<string, BadgeTone> = {
  stamped: 'success',
  error: 'critical',
  cancelled: 'neutral',
}

export function FacturasPage() {
  const { data: member } = useCurrentMember()
  const storeId = member?.store_id

  const invoicesQuery = useQuery({
    queryKey: ['invoices', storeId],
    queryFn: () => listInvoices(storeId!),
    enabled: !!storeId,
  })

  function handleDownload(invoiceId: string, format: 'pdf' | 'xml') {
    downloadInvoiceFile(invoiceId, format).catch((err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo descargar el archivo')
    })
  }

  if (!storeId) return null

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-carbon-900 dark:text-paper text-2xl font-bold">Facturas</h1>
        <p className="text-carbon-500 dark:text-carbon-400 text-sm">
          Facturas electrónicas (CFDI) emitidas desde tus ventas.
        </p>
      </div>

      {invoicesQuery.isLoading && <SkeletonList />}
      {invoicesQuery.data?.length === 0 && (
        <EmptyState
          icon="🧾"
          title="Sin facturas todavía"
          description='Factura una venta desde "Ventas" → detalle de la venta → Facturar.'
        />
      )}

      <ul className="flex flex-col gap-2">
        {invoicesQuery.data?.map((invoice) => (
          <li key={invoice.id}>
            <Card className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-carbon-900 dark:text-paper font-medium">
                    {invoice.customer_name}
                  </p>
                  <p className="text-carbon-500 dark:text-carbon-400 text-xs">
                    {invoice.customer_rfc} · {new Date(invoice.created_at).toLocaleString('es-MX')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="text-carbon-900 dark:text-paper font-bold tabular-nums">
                    ${invoice.total.toFixed(2)}
                  </p>
                  <Badge tone={STATUS_TONES[invoice.status] ?? 'neutral'}>
                    {STATUS_LABELS[invoice.status] ?? invoice.status}
                  </Badge>
                </div>
              </div>
              {invoice.status === 'stamped' && (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={() => handleDownload(invoice.id, 'pdf')}>
                    📄 PDF
                  </Button>
                  <Button variant="secondary" onClick={() => handleDownload(invoice.id, 'xml')}>
                    🗂️ XML
                  </Button>
                </div>
              )}
              {invoice.status === 'error' && invoice.error_message && (
                <p className="text-xs text-red-600 dark:text-red-400">{invoice.error_message}</p>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
