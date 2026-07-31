import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/ui/Modal'
import { TextField } from '../../components/ui/TextField'
import { Button } from '../../components/ui/Button'
import { createCustomer, updateCustomer } from './api'
import type { Database } from '../../lib/database/types'

type Customer = Database['public']['Tables']['customers']['Row']

const schema = z.object({
  name: z.string().trim().min(2, 'Ingresa el nombre'),
  phone: z.string().trim().optional(),
  email: z.email('Correo inválido').optional().or(z.literal('')),
  credit_limit: z.coerce.number().min(0, 'El límite no puede ser negativo'),
})

type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

interface CustomerFormDialogProps {
  open: boolean
  onClose: () => void
  storeId: string
  customer: Customer | null
}

export function CustomerFormDialog({ open, onClose, storeId, customer }: CustomerFormDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!customer

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', email: '', credit_limit: 0 },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: customer?.name ?? '',
        phone: customer?.phone ?? '',
        email: customer?.email ?? '',
        credit_limit: customer?.credit_limit ?? 0,
      })
    }
  }, [open, customer, reset])

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        name: values.name,
        phone: values.phone || null,
        email: values.email || null,
        credit_limit: values.credit_limit,
      }
      if (isEdit) {
        await updateCustomer(customer.id, payload)
      } else {
        await createCustomer({ ...payload, store_id: storeId })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', storeId] })
      onClose()
    },
  })

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar cliente' : 'Nuevo cliente'}>
      <form
        onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
        className="flex flex-col gap-4"
        noValidate
      >
        <TextField label="Nombre" error={errors.name?.message} {...register('name')} />
        <TextField
          label="Teléfono"
          type="tel"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <TextField
          label="Correo (opcional)"
          type="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Límite de crédito"
          type="number"
          step="0.01"
          error={errors.credit_limit?.message}
          {...register('credit_limit')}
        />
        {saveMutation.isError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {(saveMutation.error as Error).message}
          </p>
        )}
        <Button type="submit" loading={isSubmitting || saveMutation.isPending} className="w-full">
          {isEdit ? 'Guardar cambios' : 'Crear cliente'}
        </Button>
      </form>
    </Modal>
  )
}
