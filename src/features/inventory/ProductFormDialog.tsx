import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/ui/Modal'
import { TextField } from '../../components/ui/TextField'
import { Button } from '../../components/ui/Button'
import {
  createProduct,
  updateProduct,
  uploadProductImage,
  listCategories,
  createCategory,
  listVariants,
  createVariant,
  deleteVariant,
} from './api'
import type { Database } from '../../lib/database/types'

type Product = Database['public']['Tables']['products']['Row']

// Una "pieza" no se vende fraccionada — 2.99 piezas no existe. kg/g/lt/m sí
// admiten decimales (2.5 kg de arroz a granel es real). Se valida aquí,
// no solo con el step del input, porque el step no bloquea pegar/escribir
// un decimal a mano.
const wholeWhenPiece = (data: { unit_type: string; value: number }) =>
  data.unit_type !== 'piece' || Number.isInteger(data.value)

const schema = z
  .object({
    name: z.string().trim().min(2, 'Ingresa el nombre'),
    barcode: z.string().trim().optional(),
    category_id: z.string().optional(),
    newCategory: z.string().trim().optional(),
    price: z.coerce.number().min(0, 'El precio no puede ser negativo'),
    cost: z.coerce.number().min(0, 'El costo no puede ser negativo'),
    unit_type: z.enum(['piece', 'kg', 'g', 'lt', 'm']),
    initial_stock: z.coerce.number().min(0),
    min_stock: z.coerce.number().min(0),
    is_favorite: z.boolean(),
    active: z.boolean(),
  })
  .refine((d) => wholeWhenPiece({ unit_type: d.unit_type, value: d.initial_stock }), {
    message: 'El stock de productos por pieza debe ser un número entero',
    path: ['initial_stock'],
  })
  .refine((d) => wholeWhenPiece({ unit_type: d.unit_type, value: d.min_stock }), {
    message: 'El stock mínimo por pieza debe ser un número entero',
    path: ['min_stock'],
  })

type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

interface ProductFormDialogProps {
  open: boolean
  onClose: () => void
  storeId: string
  product: Product | null
}

export function ProductFormDialog({ open, onClose, storeId, product }: ProductFormDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!product

  const categoriesQuery = useQuery({
    queryKey: ['categories', storeId],
    queryFn: () => listCategories(storeId),
    enabled: open,
  })

  const variantsQuery = useQuery({
    queryKey: ['variants', product?.id],
    queryFn: () => listVariants(product!.id),
    enabled: open && isEdit,
  })

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      barcode: '',
      category_id: '',
      newCategory: '',
      price: 0,
      cost: 0,
      unit_type: 'piece',
      initial_stock: 0,
      min_stock: 0,
      is_favorite: false,
      active: true,
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: product?.name ?? '',
        barcode: product?.barcode ?? '',
        category_id: product?.category_id ?? '',
        newCategory: '',
        price: product?.price ?? 0,
        cost: product?.cost ?? 0,
        unit_type: product?.unit_type ?? 'piece',
        initial_stock: 0,
        min_stock: product?.min_stock ?? 0,
        is_favorite: product?.is_favorite ?? false,
        active: product?.active ?? true,
      })
    }
  }, [open, product, reset])

  const [variantName, setVariantName] = useState('')
  const [variantFactor, setVariantFactor] = useState('')
  const [variantPrice, setVariantPrice] = useState('')
  // Inicializados directamente (sin efecto) — el componente se remonta por
  // `key` en el call site cada vez que el diálogo se abre, así que estos
  // valores ya nacen correctos para el producto actual.
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url ?? null)

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      let categoryId = values.category_id || null
      if (values.newCategory?.trim()) {
        const cat = await createCategory(storeId, values.newCategory.trim())
        categoryId = cat.id
      }

      const payload = {
        name: values.name,
        barcode: values.barcode || null,
        category_id: categoryId,
        price: values.price,
        cost: values.cost,
        unit_type: values.unit_type,
        min_stock: values.min_stock,
        is_favorite: values.is_favorite,
        active: values.active,
      }

      const savedId = isEdit
        ? (await updateProduct(product.id, payload)).id
        : (await createProduct({ ...payload, store_id: storeId, stock: values.initial_stock })).id

      if (imageFile) {
        const url = await uploadProductImage(storeId, savedId, imageFile)
        await updateProduct(savedId, { image_url: url })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] })
      onClose()
    },
  })

  const addVariantMutation = useMutation({
    mutationFn: () =>
      createVariant({
        store_id: storeId,
        product_id: product!.id,
        name: variantName,
        conversion_factor: Number.parseFloat(variantFactor) || 1,
        price: Number.parseFloat(variantPrice) || 0,
        cost: 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variants', product?.id] })
      setVariantName('')
      setVariantFactor('')
      setVariantPrice('')
    },
  })

  const deleteVariantMutation = useMutation({
    mutationFn: (id: string) => deleteVariant(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['variants', product?.id] }),
  })

  const newCategory = useWatch({ control, name: 'newCategory' })
  const unitType = useWatch({ control, name: 'unit_type' })
  const stockStep = unitType === 'piece' ? '1' : '0.01'

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar producto' : 'Nuevo producto'}>
      <form
        onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="flex items-center gap-3">
          <label
            htmlFor="product-photo"
            className="border-carbon-200 dark:border-carbon-700 bg-carbon-50 dark:bg-carbon-800 relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border"
          >
            {imagePreview ? (
              <img src={imagePreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl" aria-hidden="true">
                📷
              </span>
            )}
            <input
              id="product-photo"
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setImageFile(file)
                setImagePreview(URL.createObjectURL(file))
              }}
            />
          </label>
          <div className="text-carbon-500 dark:text-carbon-400 text-sm">
            <p className="font-medium">Foto del producto</p>
            <p>Toca para tomarla con la cámara o elegir de la galería.</p>
          </div>
        </div>

        <TextField label="Nombre" error={errors.name?.message} {...register('name')} />
        <TextField
          label="Código de barras (opcional)"
          error={errors.barcode?.message}
          {...register('barcode')}
        />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="category_id"
            className="text-carbon-700 dark:text-carbon-300 text-sm font-medium"
          >
            Categoría
          </label>
          <select
            id="category_id"
            disabled={!!newCategory}
            className="border-carbon-200 text-carbon-900 dark:border-carbon-700 dark:bg-carbon-900 dark:text-paper rounded-xl border bg-white px-4 py-2.5 text-base disabled:opacity-50"
            {...register('category_id')}
          >
            <option value="">Sin categoría</option>
            {categoriesQuery.data?.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <TextField label="O crear categoría nueva" {...register('newCategory')} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Precio de venta"
            type="number"
            step="0.01"
            error={errors.price?.message}
            {...register('price')}
          />
          <TextField
            label="Costo"
            type="number"
            step="0.01"
            error={errors.cost?.message}
            {...register('cost')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="unit_type"
              className="text-carbon-700 dark:text-carbon-300 text-sm font-medium"
            >
              Unidad
            </label>
            <select
              id="unit_type"
              className="border-carbon-200 text-carbon-900 dark:border-carbon-700 dark:bg-carbon-900 dark:text-paper rounded-xl border bg-white px-4 py-2.5 text-base"
              {...register('unit_type')}
            >
              <option value="piece">Pieza</option>
              <option value="kg">Kilogramo</option>
              <option value="g">Gramo</option>
              <option value="lt">Litro</option>
              <option value="m">Metro</option>
            </select>
          </div>
          <TextField
            label="Stock mínimo"
            type="number"
            step={stockStep}
            error={errors.min_stock?.message}
            {...register('min_stock')}
          />
        </div>

        {!isEdit && (
          <TextField
            label="Stock inicial"
            type="number"
            step={stockStep}
            error={errors.initial_stock?.message}
            {...register('initial_stock')}
          />
        )}

        <label className="text-carbon-700 dark:text-carbon-300 flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4" {...register('is_favorite')} />
          Mostrar en favoritos del POS
        </label>
        <label className="text-carbon-700 dark:text-carbon-300 flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4" {...register('active')} />
          Activo (visible en el catálogo)
        </label>

        {saveMutation.isError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {(saveMutation.error as Error).message}
          </p>
        )}

        <Button type="submit" loading={isSubmitting || saveMutation.isPending} className="w-full">
          {isEdit ? 'Guardar cambios' : 'Crear producto'}
        </Button>
      </form>

      {isEdit && (
        <div className="border-carbon-100 dark:border-carbon-800 mt-6 border-t pt-4">
          <p className="text-carbon-700 dark:text-carbon-300 mb-2 text-sm font-medium">
            Presentaciones (pieza/caja/paquete)
          </p>
          <ul className="mb-3 flex flex-col gap-1">
            {variantsQuery.data?.map((variant) => (
              <li
                key={variant.id}
                className="bg-carbon-50 dark:bg-carbon-800 flex items-center justify-between rounded-lg px-3 py-2 text-sm"
              >
                <span>
                  {variant.name} (x{variant.conversion_factor}) — ${variant.price.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => deleteVariantMutation.mutate(variant.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-3 gap-2">
            <input
              placeholder="Nombre (ej. Caja c/24)"
              value={variantName}
              onChange={(e) => setVariantName(e.target.value)}
              className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 rounded-lg border px-2 py-2 text-sm"
            />
            <input
              placeholder="Factor"
              type="number"
              value={variantFactor}
              onChange={(e) => setVariantFactor(e.target.value)}
              className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 rounded-lg border px-2 py-2 text-sm"
            />
            <input
              placeholder="Precio"
              type="number"
              value={variantPrice}
              onChange={(e) => setVariantPrice(e.target.value)}
              className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 rounded-lg border px-2 py-2 text-sm"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            className="mt-2 w-full"
            disabled={!variantName || !variantFactor}
            loading={addVariantMutation.isPending}
            onClick={() => addVariantMutation.mutate()}
          >
            + Agregar presentación
          </Button>
        </div>
      )}
    </Modal>
  )
}
