import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../../components/ui/Modal'
import { TextField } from '../../../components/ui/TextField'
import { Button } from '../../../components/ui/Button'
import { createStaffMember } from './api'
import { PERMISSION_KEYS, PERMISSION_LABELS, defaultPermissionsForRole } from '../permissions'

const schema = z.object({
  full_name: z.string().trim().min(2, 'Ingresa el nombre completo'),
  email: z.email('Correo inválido').optional().or(z.literal('')),
  role: z.enum(['manager', 'cashier']),
  pin: z.string().regex(/^\d{4,6}$/, 'El PIN debe tener entre 4 y 6 dígitos'),
  permissions: z.record(z.string(), z.boolean()),
})

type FormValues = z.infer<typeof schema>

interface CreateStaffDialogProps {
  open: boolean
  onClose: () => void
  storeId: string
}

export function CreateStaffDialog({ open, onClose, storeId }: CreateStaffDialogProps) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'cashier', permissions: defaultPermissionsForRole('cashier') },
  })

  const role = useWatch({ control, name: 'role' })

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createStaffMember({
        full_name: values.full_name,
        email: values.email || undefined,
        role: values.role,
        pin: values.pin,
        permissions: values.permissions as Record<string, boolean>,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', storeId] })
      reset()
      onClose()
    },
  })

  return (
    <Modal open={open} onClose={onClose} title="Nuevo empleado">
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-col gap-4"
        noValidate
      >
        <TextField
          label="Nombre completo"
          error={errors.full_name?.message}
          {...register('full_name')}
        />
        <TextField
          label="Correo (opcional)"
          type="email"
          placeholder="Solo si el empleado también entrará con correo"
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="role"
            className="text-carbon-700 dark:text-carbon-300 text-sm font-medium"
          >
            Rol
          </label>
          <select
            id="role"
            className="border-carbon-200 text-carbon-900 dark:border-carbon-700 dark:bg-carbon-900 dark:text-paper rounded-xl border bg-white px-4 py-2.5 text-base"
            {...register('role')}
          >
            <option value="cashier">Cajero</option>
            <option value="manager">Gerente</option>
          </select>
        </div>

        <TextField
          label="PIN (4-6 dígitos)"
          inputMode="numeric"
          error={errors.pin?.message}
          {...register('pin')}
        />

        {role === 'cashier' && (
          <fieldset className="border-carbon-200 dark:border-carbon-700 flex flex-col gap-2 rounded-xl border p-3">
            <legend className="text-carbon-700 dark:text-carbon-300 px-1 text-sm font-medium">
              Permisos adicionales
            </legend>
            {PERMISSION_KEYS.map((key) => (
              <label
                key={key}
                className="text-carbon-700 dark:text-carbon-300 flex items-center gap-2 text-sm"
              >
                <input type="checkbox" className="h-4 w-4" {...register(`permissions.${key}`)} />
                {PERMISSION_LABELS[key]}
              </label>
            ))}
          </fieldset>
        )}

        {mutation.isError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {(mutation.error as Error).message}
          </p>
        )}

        <Button type="submit" loading={isSubmitting || mutation.isPending} className="mt-2 w-full">
          Crear empleado
        </Button>
      </form>
    </Modal>
  )
}
