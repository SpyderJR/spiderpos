import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { fetchCustomerStatement, recordCustomerPayment } from './api'
import { buildStatementPdf, buildCollectionWhatsAppLink } from './statementPdf'
import type { Database } from '../../lib/database/types'

type Customer = Database['public']['Tables']['customers']['Row']

interface CustomerStatementModalProps {
  customer: Customer | null
  storeId: string
  storeName: string
  onClose: () => void
}

export function CustomerStatementModal({
  customer,
  storeId,
  storeName,
  onClose,
}: CustomerStatementModalProps) {
  const queryClient = useQueryClient()
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  const statementQuery = useQuery({
    queryKey: ['statement', customer?.id],
    queryFn: () => fetchCustomerStatement(customer!.id),
    enabled: !!customer,
  })

  const paymentMutation = useMutation({
    mutationFn: () => recordCustomerPayment(customer!.id, Number.parseFloat(paymentAmount), 'cash'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statement', customer?.id] })
      queryClient.invalidateQueries({ queryKey: ['customers', storeId] })
      setPaymentAmount('')
      setPaymentOpen(false)
    },
  })

  async function exportPdf() {
    if (!customer || !statementQuery.data) return
    setExportingPdf(true)
    try {
      const blob = await buildStatementPdf(customer, statementQuery.data, storeName)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `estado-de-cuenta-${customer.name.replace(/\s+/g, '-')}.pdf`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } finally {
      setExportingPdf(false)
    }
  }

  function collectWhatsApp() {
    if (!customer) return
    window.open(buildCollectionWhatsAppLink(customer, storeName), '_blank', 'noopener')
  }

  if (!customer) return null

  return (
    <Modal open={!!customer} onClose={onClose} title={`Estado de cuenta — ${customer.name}`}>
      <div className="flex flex-col gap-4">
        <div className="bg-carbon-50 dark:bg-carbon-800 rounded-xl p-4 text-center">
          <p className="text-carbon-500 dark:text-carbon-400 text-sm">Saldo actual</p>
          <p className="text-carbon-900 dark:text-paper text-2xl font-bold">
            ${customer.credit_balance.toFixed(2)}
          </p>
          <p className="text-carbon-400 text-xs">Límite: ${customer.credit_limit.toFixed(2)}</p>
        </div>

        {statementQuery.isLoading && (
          <p className="text-carbon-500 dark:text-carbon-400 text-sm">Cargando...</p>
        )}

        <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
          {statementQuery.data?.map((entry) => (
            <li key={entry.id} className="flex justify-between text-sm">
              <span className="text-carbon-600 dark:text-carbon-300">
                {new Date(entry.date).toLocaleDateString('es-MX')} · {entry.description}
              </span>
              <span
                className={
                  entry.amount < 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-carbon-900 dark:text-paper'
                }
              >
                {entry.amount < 0 ? '-' : ''}${Math.abs(entry.amount).toFixed(2)}
              </span>
            </li>
          ))}
          {statementQuery.data?.length === 0 && (
            <p className="text-carbon-400 text-center text-sm">Sin movimientos todavía.</p>
          )}
        </ul>

        {paymentOpen ? (
          <div className="border-carbon-200 dark:border-carbon-700 flex flex-col gap-2 rounded-xl border p-3">
            <input
              type="number"
              inputMode="decimal"
              autoFocus
              placeholder="Monto del abono"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 rounded-lg border px-3 py-2 text-center text-lg"
            />
            {paymentMutation.isError && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {(paymentMutation.error as Error).message}
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setPaymentOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                disabled={!(Number.parseFloat(paymentAmount) > 0)}
                loading={paymentMutation.isPending}
                onClick={() => paymentMutation.mutate()}
              >
                Registrar abono
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <Button variant="secondary" onClick={() => setPaymentOpen(true)}>
              💰 Abonar
            </Button>
            <Button variant="secondary" loading={exportingPdf} onClick={exportPdf}>
              📄 PDF
            </Button>
            <Button variant="secondary" onClick={collectWhatsApp}>
              💬 Cobrar
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
