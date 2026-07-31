import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/ui/Modal'
import { TextField } from '../../components/ui/TextField'
import { Button } from '../../components/ui/Button'
import { createPromotion } from './api'
import { listCategories, listProducts } from '../inventory/api'

const schema = z.object({
  name: z.string().trim().min(2, 'Ingresa un nombre'),
  type: z.enum(['percentage', 'fixed', '2x1', '3x2', 'bulk_price']),
  value: z.coerce.number().min(0).optional(),
  min_quantity: z.coerce.number().min(1).optional(),
  target: z.enum(['product', 'category']),
  product_id: z.string().optional(),
  category_id: z.string().optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
})

type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

interface PromotionFormDialogProps {
  open: boolean
  onClose: () => void
  storeId: string
}

export function PromotionFormDialog({ open, onClose, storeId }: PromotionFormDialogProps) {
  const queryClient = useQueryClient()

  const productsQuery = useQuery({
    queryKey: ['products', storeId],
    queryFn: () => listProducts(storeId),
    enabled: open,
  })
  const categoriesQuery = useQuery({
    queryKey: ['categories', storeId],
    queryFn: () => listCategories(storeId),
    enabled: open,
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'percentage', target: 'product' },
  })

  const type = useWatch({ control, name: 'type' })
  const target = useWatch({ control, name: 'target' })

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createPromotion({
        store_id: storeId,
        name: values.name,
        type: values.type,
        value: values.value ?? null,
        min_quantity: values.min_quantity ?? null,
        product_id: values.target === 'product' ? values.product_id || null : null,
        category_id: values.target === 'category' ? values.category_id || null : null,
        starts_at: values.starts_at || null,
        ends_at: values.ends_at || null,
        active: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions', storeId] })
      reset()
      onClose()
    },
  })

  return (
    <Modal open={open} onClose={onClose} title="Nueva promoción">
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-col gap-4"
        noValidate
      >
        <TextField label="Nombre" error={errors.name?.message} {...register('name')} />

        <div className="flex flex-col gap-1.5">
          <label className="text-carbon-700 dark:text-carbon-300 text-sm font-medium">Tipo</label>
          <select
            className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 rounded-xl border bg-white px-4 py-2.5"
            {...register('type')}
          >
            <option value="percentage">Descuento porcentual</option>
            <option value="fixed">Descuento fijo por unidad</option>
            <option value="2x1">2x1</option>
            <option value="3x2">3x2</option>
            <option value="bulk_price">Precio por volumen (mayoreo)</option>
          </select>
        </div>

        {(type === 'percentage' || type === 'fixed' || type === 'bulk_price') && (
          <TextField
            label={
              type === 'percentage'
                ? 'Porcentaje de descuento (%)'
                : type === 'fixed'
                  ? 'Monto de descuento'
                  : 'Precio de mayoreo'
            }
            type="number"
            step="0.01"
            {...register('value')}
          />
        )}
        {type === 'bulk_price' && (
          <TextField label="Cantidad mínima (piezas)" type="number" {...register('min_quantity')} />
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-carbon-700 dark:text-carbon-300 text-sm font-medium">
            Aplica a
          </label>
          <select
            className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 rounded-xl border bg-white px-4 py-2.5"
            {...register('target')}
          >
            <option value="product">Un producto</option>
            <option value="category">Una categoría</option>
          </select>
        </div>

        {target === 'product' ? (
          <select
            className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 rounded-xl border bg-white px-4 py-2.5"
            {...register('product_id')}
          >
            <option value="">Selecciona producto</option>
            {productsQuery.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        ) : (
          <select
            className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 rounded-xl border bg-white px-4 py-2.5"
            {...register('category_id')}
          >
            <option value="">Selecciona categoría</option>
            {categoriesQuery.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        <div className="grid grid-cols-2 gap-4">
          <TextField label="Inicia (opcional)" type="date" {...register('starts_at')} />
          <TextField label="Termina (opcional)" type="date" {...register('ends_at')} />
        </div>

        {mutation.isError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {(mutation.error as Error).message}
          </p>
        )}

        <Button type="submit" loading={isSubmitting || mutation.isPending} className="w-full">
          Crear promoción
        </Button>
      </form>
    </Modal>
  )
}
