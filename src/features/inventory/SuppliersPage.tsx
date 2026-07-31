import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCurrentMember } from '../auth/useCurrentMember'
import { Modal } from '../../components/ui/Modal'
import { TextField } from '../../components/ui/TextField'
import { Button } from '../../components/ui/Button'
import { listSuppliers, createSupplier, deleteSupplier } from './api'

const schema = z.object({
  name: z.string().trim().min(2, 'Ingresa el nombre'),
  contact_phone: z.string().trim().optional(),
  contact_email: z.email('Correo inválido').optional().or(z.literal('')),
  notes: z.string().trim().optional(),
})

type FormValues = z.infer<typeof schema>

export function SuppliersPage() {
  const { data: member } = useCurrentMember()
  const storeId = member?.store_id
  const canManage = member?.role === 'owner' || member?.role === 'manager'
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', storeId],
    queryFn: () => listSuppliers(storeId!),
    enabled: !!storeId,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      createSupplier({
        store_id: storeId!,
        name: values.name,
        contact_phone: values.contact_phone || null,
        contact_email: values.contact_email || null,
        notes: values.notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', storeId] })
      reset()
      setFormOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSupplier(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers', storeId] }),
  })

  if (!storeId) return null

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-carbon-900 dark:text-paper text-2xl font-bold">Proveedores</h1>
        {canManage && <Button onClick={() => setFormOpen(true)}>+ Proveedor</Button>}
      </div>

      <ul className="flex flex-col gap-2">
        {suppliersQuery.data?.map((supplier) => (
          <li
            key={supplier.id}
            className="border-carbon-200 dark:border-carbon-800 dark:bg-carbon-900 flex items-center justify-between rounded-xl border bg-white p-4"
          >
            <div>
              <p className="text-carbon-900 dark:text-paper font-medium">{supplier.name}</p>
              <p className="text-carbon-500 dark:text-carbon-400 text-sm">
                {[supplier.contact_phone, supplier.contact_email].filter(Boolean).join(' · ') ||
                  'Sin contacto'}
              </p>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`¿Eliminar a ${supplier.name}?`)) deleteMutation.mutate(supplier.id)
                }}
                className="min-h-11 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Eliminar
              </button>
            )}
          </li>
        ))}
        {suppliersQuery.data?.length === 0 && (
          <p className="text-carbon-400 text-center text-sm">
            Todavía no tienes proveedores registrados.
          </p>
        )}
      </ul>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Nuevo proveedor">
        <form
          onSubmit={handleSubmit((values) => createMutation.mutate(values))}
          className="flex flex-col gap-4"
          noValidate
        >
          <TextField label="Nombre" error={errors.name?.message} {...register('name')} />
          <TextField
            label="Teléfono"
            error={errors.contact_phone?.message}
            {...register('contact_phone')}
          />
          <TextField
            label="Correo"
            type="email"
            error={errors.contact_email?.message}
            {...register('contact_email')}
          />
          <TextField label="Notas (días de visita, etc.)" {...register('notes')} />
          {createMutation.isError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {(createMutation.error as Error).message}
            </p>
          )}
          <Button
            type="submit"
            loading={isSubmitting || createMutation.isPending}
            className="w-full"
          >
            Crear proveedor
          </Button>
        </form>
      </Modal>
    </div>
  )
}
