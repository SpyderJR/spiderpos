import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/TextField'
import { toast } from '../../store/useToastStore'
import { createInvoice } from './api'
import { USOS_CFDI, RFC_PUBLICO_GENERAL } from '../../lib/satCatalogs'

interface FacturarModalProps {
  open: boolean
  onClose: () => void
  saleId: string
}

export function FacturarModal({ open, onClose, saleId }: FacturarModalProps) {
  const [rfc, setRfc] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [usoCfdi, setUsoCfdi] = useState<string>('G03')
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () =>
      createInvoice({
        sale_id: saleId,
        customer_rfc: rfc.trim().toUpperCase(),
        customer_name: name.trim(),
        customer_email: email.trim() || undefined,
        uso_cfdi: usoCfdi,
      }),
    onSuccess: () => {
      toast.success('Factura timbrada correctamente')
      queryClient.invalidateQueries({ queryKey: ['invoice', saleId] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      onClose()
    },
  })

  function fillPublicoGeneral() {
    setRfc(RFC_PUBLICO_GENERAL)
    setName('PÚBLICO EN GENERAL')
    setUsoCfdi('S01')
  }

  return (
    <Modal open={open} onClose={onClose} title="Facturar venta">
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={fillPublicoGeneral}
          className="border-carbon-200 text-carbon-600 hover:bg-carbon-50 dark:border-carbon-700 dark:text-carbon-300 dark:hover:bg-carbon-800 self-start rounded-lg border px-3 py-1.5 text-xs font-medium"
        >
          El cliente no tiene RFC (público en general)
        </button>

        <TextField
          label="RFC del cliente"
          value={rfc}
          onChange={(e) => setRfc(e.target.value.toUpperCase())}
          placeholder="XAXX010101000"
          maxLength={13}
        />
        <TextField
          label="Nombre o razón social"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Como aparece en su constancia fiscal"
        />
        <TextField
          label="Correo (opcional, para enviarle la factura)"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-carbon-700 dark:text-carbon-300 text-sm font-medium">
            Uso de CFDI
          </label>
          <select
            value={usoCfdi}
            onChange={(e) => setUsoCfdi(e.target.value)}
            className="border-carbon-200 text-carbon-900 focus:border-brand-500 focus:ring-brand-500/30 dark:border-carbon-700 dark:bg-carbon-900 dark:text-paper rounded-xl border bg-white px-4 py-2.5 text-base outline-none focus:ring-2"
          >
            {USOS_CFDI.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>

        {mutation.isError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {mutation.error instanceof Error ? mutation.error.message : 'No se pudo facturar'}
          </p>
        )}

        <Button
          onClick={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={rfc.trim().length < 12 || name.trim().length === 0}
          className="w-full"
        >
          Timbrar factura
        </Button>
      </div>
    </Modal>
  )
}
