import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { TextField } from '../../../components/ui/TextField'
import { Button } from '../../../components/ui/Button'
import { useCurrentMember } from '../../auth/useCurrentMember'
import { updateStoreProfile, uploadStoreLogo } from './api'

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  abarrotes: 'Abarrotes',
  papeleria: 'Papelería',
  farmacia: 'Farmacia',
  ferreteria: 'Ferretería',
}

const schema = z.object({
  name: z.string().trim().min(2, 'Ingresa el nombre de tu negocio'),
  razon_social: z.string().trim().optional(),
  rfc: z.string().trim().optional(),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  footer_message: z.string().trim().max(200, 'Máximo 200 caracteres').optional(),
  payout_clabe: z
    .string()
    .trim()
    .regex(/^$|^\d{18}$/, 'La CLABE debe tener 18 dígitos')
    .optional(),
})

type FormValues = z.infer<typeof schema>

export function BusinessProfilePage() {
  const { data: member } = useCurrentMember()
  const store = member?.stores
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const isOwner = member?.role === 'owner'

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: store
      ? {
          name: store.name,
          razon_social: (store.tax_data as Record<string, string> | null)?.razon_social ?? '',
          rfc: (store.tax_data as Record<string, string> | null)?.rfc ?? '',
          address: store.address ?? '',
          phone: store.phone ?? '',
          footer_message: store.footer_message ?? '',
          payout_clabe: store.payout_clabe ?? '',
        }
      : undefined,
  })

  useEffect(() => {
    if (saved) {
      const t = setTimeout(() => setSaved(false), 2500)
      return () => clearTimeout(t)
    }
  }, [saved])

  const logoMutation = useMutation({
    mutationFn: (file: File) => uploadStoreLogo(store!.id, file),
    onSuccess: () => {
      setLogoError(null)
      queryClient.invalidateQueries({ queryKey: ['current-member'] })
    },
    onError: (err: Error) => setLogoError(err.message),
  })

  async function onSubmit(values: FormValues) {
    if (!store) return
    await updateStoreProfile(store.id, {
      name: values.name,
      tax_data: { razon_social: values.razon_social ?? '', rfc: values.rfc ?? '' },
      address: values.address || null,
      phone: values.phone || null,
      footer_message: values.footer_message || null,
      payout_clabe: values.payout_clabe || null,
    })
    await queryClient.invalidateQueries({ queryKey: ['current-member'] })
    reset(values)
    setSaved(true)
  }

  if (!store) return null

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-carbon-900 dark:text-paper text-2xl font-bold">Perfil comercial</h1>
        <p className="text-carbon-500 dark:text-carbon-400 text-sm">
          Giro: <span className="font-medium">{BUSINESS_TYPE_LABELS[store.business_type]}</span>
        </p>
      </div>

      <section className="border-carbon-100 dark:border-carbon-800 dark:bg-carbon-900 flex items-center gap-4 rounded-2xl border bg-white p-4 shadow-[var(--shadow-soft)]">
        {store.logo_url ? (
          <img
            src={store.logo_url}
            alt={`Logo de ${store.name}`}
            className="h-16 w-16 rounded-xl object-cover"
          />
        ) : (
          <div className="bg-carbon-100 dark:bg-carbon-800 flex h-16 w-16 items-center justify-center rounded-xl text-2xl">
            🏪
          </div>
        )}
        <div className="flex-1">
          <p className="text-carbon-800 dark:text-carbon-100 text-sm font-medium">
            Logo (tickets, PDF y login)
          </p>
          {logoError && <p className="text-sm text-red-600 dark:text-red-400">{logoError}</p>}
        </div>
        {isOwner && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) logoMutation.mutate(file)
                e.target.value = ''
              }}
            />
            <Button
              type="button"
              variant="secondary"
              loading={logoMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              Cambiar
            </Button>
          </>
        )}
      </section>

      {!isOwner ? (
        <p className="bg-carbon-100 text-carbon-600 dark:bg-carbon-800 dark:text-carbon-300 rounded-xl p-4 text-sm">
          Solo el dueño de la tienda puede editar el perfil comercial.
        </p>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="border-carbon-100 dark:border-carbon-800 dark:bg-carbon-900 flex flex-col gap-4 rounded-2xl border bg-white p-6 shadow-[var(--shadow-soft)]"
          noValidate
        >
          <TextField
            label="Nombre del negocio"
            error={errors.name?.message}
            {...register('name')}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Razón social"
              error={errors.razon_social?.message}
              {...register('razon_social')}
            />
            <TextField label="RFC" error={errors.rfc?.message} {...register('rfc')} />
          </div>
          <TextField label="Dirección" error={errors.address?.message} {...register('address')} />
          <TextField
            label="Teléfono"
            type="tel"
            error={errors.phone?.message}
            {...register('phone')}
          />
          <TextField
            label="Mensaje de pie de ticket"
            error={errors.footer_message?.message}
            {...register('footer_message')}
          />
          <TextField
            label="CLABE interbancaria (payouts)"
            inputMode="numeric"
            disabled={store?.is_demo}
            error={store?.is_demo ? 'No disponible en modo demo' : errors.payout_clabe?.message}
            {...register('payout_clabe')}
          />

          <div className="mt-2 flex items-center gap-3">
            <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
              Guardar cambios
            </Button>
            {saved && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400">Guardado ✓</span>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
