import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/ui/Button'
import { toast } from '../../store/useToastStore'
import { fetchInvoiceForSale, cancelInvoice, downloadInvoiceFile } from './api'
import { FacturarModal } from './FacturarModal'

interface InvoiceSectionProps {
  saleId: string
  canCancel: boolean
}

export function InvoiceSection({ saleId, canCancel }: InvoiceSectionProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const queryClient = useQueryClient()

  const invoiceQuery = useQuery({
    queryKey: ['invoice', saleId],
    queryFn: () => fetchInvoiceForSale(saleId),
  })

  const cancelMutation = useMutation({
    mutationFn: (invoiceId: string) => cancelInvoice(invoiceId),
    onSuccess: () => {
      toast.success('Factura cancelada')
      queryClient.invalidateQueries({ queryKey: ['invoice', saleId] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'No se pudo cancelar'),
  })

  const invoice = invoiceQuery.data

  function handleDownload(format: 'pdf' | 'xml') {
    downloadInvoiceFile(invoice!.id, format).catch((err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo descargar el archivo')
    })
  }

  if (invoiceQuery.isLoading) return null

  if (!invoice || invoice.status === 'cancelled') {
    return (
      <div className="border-carbon-100 dark:border-carbon-800 border-t pt-4">
        <Button variant="secondary" className="w-full" onClick={() => setModalOpen(true)}>
          🧾 Facturar
        </Button>
        {invoice?.status === 'cancelled' && (
          <p className="text-carbon-400 mt-1.5 text-center text-xs">
            La factura anterior fue cancelada.
          </p>
        )}
        <FacturarModal open={modalOpen} onClose={() => setModalOpen(false)} saleId={saleId} />
      </div>
    )
  }

  if (invoice.status === 'error') {
    return (
      <div className="border-carbon-100 dark:border-carbon-800 flex flex-col gap-2 border-t pt-4">
        <p className="text-sm text-red-600 dark:text-red-400">
          No se pudo facturar: {invoice.error_message}
        </p>
        <Button variant="secondary" className="w-full" onClick={() => setModalOpen(true)}>
          Reintentar facturación
        </Button>
        <FacturarModal open={modalOpen} onClose={() => setModalOpen(false)} saleId={saleId} />
      </div>
    )
  }

  return (
    <div className="border-carbon-100 dark:border-carbon-800 flex flex-col gap-2 border-t pt-4">
      <p className="text-carbon-500 dark:text-carbon-400 text-xs">
        Factura timbrada · UUID {invoice.uuid_fiscal?.slice(0, 8).toUpperCase()}…
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => handleDownload('pdf')}>
          📄 PDF
        </Button>
        <Button variant="secondary" onClick={() => handleDownload('xml')}>
          🗂️ XML
        </Button>
      </div>
      {canCancel && (
        <Button
          variant="danger"
          loading={cancelMutation.isPending}
          onClick={() => cancelMutation.mutate(invoice.id)}
        >
          Cancelar factura
        </Button>
      )}
    </div>
  )
}
