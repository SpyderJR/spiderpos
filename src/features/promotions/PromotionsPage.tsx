import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCurrentMember } from '../auth/useCurrentMember'
import { Button } from '../../components/ui/Button'
import { listPromotions, togglePromotion, deletePromotion } from './api'
import { PromotionFormDialog } from './PromotionFormDialog'

const TYPE_LABELS: Record<string, string> = {
  percentage: 'Descuento %',
  fixed: 'Descuento fijo',
  '2x1': '2x1',
  '3x2': '3x2',
  bulk_price: 'Precio mayoreo',
}

export function PromotionsPage() {
  const { data: member } = useCurrentMember()
  const storeId = member?.store_id
  const canManage = member?.role === 'owner' || member?.role === 'manager'
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)

  const promotionsQuery = useQuery({
    queryKey: ['promotions', storeId],
    queryFn: () => listPromotions(storeId!),
    enabled: !!storeId,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => togglePromotion(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['promotions', storeId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePromotion(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['promotions', storeId] }),
  })

  if (!storeId) return null

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-carbon-900 dark:text-paper text-2xl font-bold">Promociones</h1>
        {canManage && <Button onClick={() => setFormOpen(true)}>+ Promoción</Button>}
      </div>

      <ul className="flex flex-col gap-2">
        {promotionsQuery.data?.map((promo) => (
          <li
            key={promo.id}
            className="border-carbon-200 dark:border-carbon-800 dark:bg-carbon-900 flex items-center justify-between rounded-xl border bg-white p-4"
          >
            <div>
              <p className="text-carbon-900 dark:text-paper font-medium">{promo.name}</p>
              <p className="text-carbon-500 dark:text-carbon-400 text-sm">
                {TYPE_LABELS[promo.type]} ·{' '}
                {promo.products?.name ?? promo.categories?.name ?? 'N/D'}
                {promo.value != null &&
                  ` · ${promo.type === 'percentage' ? `${promo.value}%` : `$${promo.value}`}`}
              </p>
            </div>
            {canManage && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleMutation.mutate({ id: promo.id, active: !promo.active })}
                  className={`min-h-11 rounded-lg px-3 text-sm font-medium ${
                    promo.active ? 'text-emerald-600 dark:text-emerald-400' : 'text-carbon-400'
                  }`}
                >
                  {promo.active ? 'Activa' : 'Inactiva'}
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(promo.id)}
                  className="min-h-11 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Eliminar
                </button>
              </div>
            )}
          </li>
        ))}
        {promotionsQuery.data?.length === 0 && (
          <p className="text-carbon-400 text-center text-sm">
            Todavía no hay promociones configuradas.
          </p>
        )}
      </ul>

      <PromotionFormDialog open={formOpen} onClose={() => setFormOpen(false)} storeId={storeId} />
    </div>
  )
}
