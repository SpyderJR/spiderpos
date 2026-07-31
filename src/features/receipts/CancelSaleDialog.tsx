import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { cancelSale } from './salesActions'

interface CancelSaleDialogProps {
  saleId: string | null
  onClose: () => void
}

export function CancelSaleDialog({ saleId, onClose }: CancelSaleDialogProps) {
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const [pin, setPin] = useState('')

  const mutation = useMutation({
    mutationFn: () => cancelSale(saleId!, reason, pin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      setReason('')
      setPin('')
      onClose()
    },
  })

  return (
    <Modal open={!!saleId} onClose={onClose} title="Cancelar venta">
      <div className="flex flex-col gap-4">
        <p className="text-carbon-500 dark:text-carbon-400 text-sm">
          Esta acción regresa el stock, revierte el saldo a crédito si aplica, y requiere
          autorización de supervisor.
        </p>
        <input
          placeholder="Motivo de la cancelación (obligatorio)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 rounded-xl border px-4 py-2.5"
        />
        <input
          type="password"
          inputMode="numeric"
          placeholder="PIN de supervisor"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 rounded-xl border px-4 py-2.5 text-center tracking-[0.3em]"
        />
        {mutation.isError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {(mutation.error as Error).message}
          </p>
        )}
        <Button
          variant="danger"
          onClick={() => mutation.mutate()}
          disabled={!reason.trim() || pin.length < 4}
          loading={mutation.isPending}
          className="w-full"
        >
          Cancelar venta
        </Button>
      </div>
    </Modal>
  )
}
