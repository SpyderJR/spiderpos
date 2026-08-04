import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/ui/Modal'
import { TextField } from '../../components/ui/TextField'
import { Button } from '../../components/ui/Button'
import { adjustStock } from './api'
import type { Database } from '../../lib/database/types'

type Product = Database['public']['Tables']['products']['Row']

interface StockAdjustDialogProps {
  product: Product | null
  storeId: string
  onClose: () => void
}

export function StockAdjustDialog({ product, storeId, onClose }: StockAdjustDialogProps) {
  const queryClient = useQueryClient()
  const [newStock, setNewStock] = useState('')
  const [reason, setReason] = useState('')

  const isPiece = product?.unit_type === 'piece'

  const mutation = useMutation({
    mutationFn: () => {
      const value = Number.parseFloat(newStock)
      return adjustStock(product!.id, isPiece ? Math.round(value) : value, reason)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] })
      setNewStock('')
      setReason('')
      onClose()
    },
  })

  if (!product) return null

  return (
    <Modal open={!!product} onClose={onClose} title={`Ajustar stock — ${product.name}`}>
      <div className="flex flex-col gap-4">
        <p className="text-carbon-500 dark:text-carbon-400 text-sm">
          Stock actual: {product.stock}
        </p>
        <TextField
          label="Nuevo stock"
          type="number"
          step={isPiece ? '1' : '0.01'}
          value={newStock}
          onChange={(e) => setNewStock(e.target.value)}
        />
        <TextField
          label="Motivo (obligatorio)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ej. merma, conteo físico, error de captura"
        />
        {mutation.isError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {(mutation.error as Error).message}
          </p>
        )}
        <Button
          onClick={() => mutation.mutate()}
          disabled={!newStock || !reason.trim()}
          loading={mutation.isPending}
          className="w-full"
        >
          Guardar ajuste
        </Button>
      </div>
    </Modal>
  )
}
