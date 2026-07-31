import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../../components/ui/Modal'
import { TextField } from '../../../components/ui/TextField'
import { Button } from '../../../components/ui/Button'
import { resetStaffPin } from './api'

const schema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'El PIN debe tener entre 4 y 6 dígitos'),
})

type FormValues = z.infer<typeof schema>

interface ResetPinDialogProps {
  open: boolean
  onClose: () => void
  storeId: string
  memberId: string
  memberName: string
}

export function ResetPinDialog({
  open,
  onClose,
  storeId,
  memberId,
  memberName,
}: ResetPinDialogProps) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => resetStaffPin(memberId, values.pin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', storeId] })
      reset()
      onClose()
    },
  })

  return (
    <Modal open={open} onClose={onClose} title={`Restablecer PIN de ${memberName}`}>
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-col gap-4"
        noValidate
      >
        <TextField
          label="Nuevo PIN (4-6 dígitos)"
          inputMode="numeric"
          error={errors.pin?.message}
          {...register('pin')}
        />
        {mutation.isError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {(mutation.error as Error).message}
          </p>
        )}
        <Button type="submit" loading={isSubmitting || mutation.isPending} className="w-full">
          Guardar nuevo PIN
        </Button>
      </form>
    </Modal>
  )
}
