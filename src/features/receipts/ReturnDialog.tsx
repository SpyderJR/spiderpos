import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { fetchSaleItemsForReturn, returnSaleItems } from './salesActions'

interface ReturnDialogProps {
  saleId: string | null
  onClose: () => void
}

export function ReturnDialog({ saleId, onClose }: ReturnDialogProps) {
  const queryClient = useQueryClient()
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [reason, setReason] = useState('')

  const itemsQuery = useQuery({
    queryKey: ['sale-items-return', saleId],
    queryFn: () => fetchSaleItemsForReturn(saleId!),
    enabled: !!saleId,
  })

  const mutation = useMutation({
    mutationFn: () => {
      const items = Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([sale_item_id, quantity]) => ({ sale_item_id, quantity }))
      return returnSaleItems(saleId!, items, reason)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      setQuantities({})
      setReason('')
      onClose()
    },
  })

  const hasSelection = Object.values(quantities).some((q) => q > 0)

  return (
    <Modal open={!!saleId} onClose={onClose} title="Devolución">
      <div className="flex flex-col gap-4">
        {itemsQuery.data?.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2">
            <div>
              <p className="text-carbon-900 dark:text-paper text-sm font-medium">
                {item.productName}
              </p>
              <p className="text-carbon-500 dark:text-carbon-400 text-xs">
                Vendido: {item.quantity} x ${item.unitPrice.toFixed(2)}
                {item.alreadyReturned > 0 && ` · ya devuelto: ${item.alreadyReturned}`}
              </p>
              <p className="text-carbon-600 dark:text-carbon-300 text-xs font-medium">
                Disponible para devolver: {item.remaining}
              </p>
            </div>
            <input
              type="number"
              min={0}
              max={item.remaining}
              step="any"
              placeholder="0"
              disabled={item.remaining <= 0}
              value={quantities[item.id] ?? ''}
              onChange={(e) =>
                setQuantities((prev) => ({
                  ...prev,
                  [item.id]: Math.min(Number.parseFloat(e.target.value) || 0, item.remaining),
                }))
              }
              className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 w-20 rounded-lg border px-2 py-1.5 text-center text-sm disabled:opacity-40"
            />
          </div>
        ))}

        <input
          placeholder="Motivo de la devolución (obligatorio)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 rounded-xl border px-4 py-2.5"
        />

        {mutation.isError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {(mutation.error as Error).message}
          </p>
        )}
        {mutation.isSuccess && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            Devolución registrada: ${mutation.data.total_returned.toFixed(2)}
          </p>
        )}

        <Button
          onClick={() => mutation.mutate()}
          disabled={!hasSelection || !reason.trim()}
          loading={mutation.isPending}
          className="w-full"
        >
          Confirmar devolución
        </Button>
      </div>
    </Modal>
  )
}
