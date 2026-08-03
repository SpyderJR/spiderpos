import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Logo } from '../../components/Logo'
import { TextField } from '../../components/ui/TextField'
import { Button } from '../../components/ui/Button'
import { createCheckout } from './api'
import { DemoEntryModal } from './DemoEntryModal'

const BUSINESS_TYPES = [
  { value: 'abarrotes', label: 'Abarrotes / tienda de conveniencia' },
  { value: 'papeleria', label: 'Papelería' },
  { value: 'farmacia', label: 'Farmacia' },
  { value: 'ferreteria', label: 'Ferretería' },
] as const

const schema = z.object({
  business_name: z.string().trim().min(2, 'Ingresa el nombre de tu negocio'),
  business_type: z.enum(['abarrotes', 'papeleria', 'farmacia', 'ferreteria']),
  owner_email: z.email('Ingresa un correo válido'),
  plan: z.enum(['monthly', 'annual']),
})

type FormValues = z.infer<typeof schema>

export function SignupPage() {
  const [searchParams] = useSearchParams()
  const initialPlan = searchParams.get('plan') === 'annual' ? 'annual' : 'monthly'
  const [serverError, setServerError] = useState<string | null>(null)
  const [demoOpen, setDemoOpen] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { plan: initialPlan },
  })

  const plan = useWatch({ control, name: 'plan' })

  async function onSubmit(values: FormValues) {
    setServerError(null)
    try {
      const { checkout_url } = await createCheckout({
        ...values,
        owner_full_name: values.owner_email.split('@')[0] || 'Dueño',
      })
      window.location.assign(checkout_url)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'No se pudo iniciar el registro')
    }
  }

  return (
    <div className="from-carbon-950 via-carbon-900 to-brand-900 flex min-h-dvh items-center justify-center bg-gradient-to-br px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="dark:bg-carbon-900 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl"
      >
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo className="h-14 w-14" />
          <h1 className="text-carbon-900 dark:text-paper text-xl font-bold">Registra tu negocio</h1>
          <p className="text-carbon-500 dark:text-carbon-400 text-sm">
            Nombre, giro, correo y listo — el resto (logo, personal, datos fiscales) lo configuras
            después, adentro.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <TextField
            label="Nombre de tu negocio"
            placeholder="Abarrotes Don Pepe"
            error={errors.business_name?.message}
            {...register('business_name')}
          />

          <div>
            <label className="text-carbon-700 dark:text-carbon-300 mb-1.5 block text-sm font-medium">
              Giro comercial
            </label>
            <select
              className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 w-full rounded-xl border px-4 py-2.5 text-sm"
              {...register('business_type')}
            >
              {BUSINESS_TYPES.map((bt) => (
                <option key={bt.value} value={bt.value}>
                  {bt.label}
                </option>
              ))}
            </select>
          </div>

          <TextField
            label="Tu correo electrónico"
            type="email"
            placeholder="rosa@ejemplo.com"
            error={errors.owner_email?.message}
            {...register('owner_email')}
          />

          <div>
            <span className="text-carbon-700 dark:text-carbon-300 mb-1.5 block text-sm font-medium">
              Plan
            </span>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`cursor-pointer rounded-xl border p-3 text-center text-sm transition-colors ${
                  plan === 'monthly'
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/50'
                    : 'border-carbon-200 dark:border-carbon-700'
                }`}
              >
                <input type="radio" value="monthly" className="sr-only" {...register('plan')} />
                <span className="text-carbon-900 dark:text-paper block font-semibold">
                  $299/mes
                </span>
              </label>
              <label
                className={`cursor-pointer rounded-xl border p-3 text-center text-sm transition-colors ${
                  plan === 'annual'
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/50'
                    : 'border-carbon-200 dark:border-carbon-700'
                }`}
              >
                <input type="radio" value="annual" className="sr-only" {...register('plan')} />
                <span className="text-carbon-900 dark:text-paper block font-semibold">
                  $2,990/año
                </span>
              </label>
            </div>
          </div>

          {serverError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {serverError}
            </p>
          )}

          <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
            Continuar al pago
          </Button>

          <p className="text-carbon-400 text-center text-xs">
            Al continuar aceptas nuestros{' '}
            <Link
              to="/terminos"
              className="hover:text-brand-600 dark:hover:text-brand-400 hover:underline"
            >
              Términos
            </Link>
            , la{' '}
            <Link
              to="/privacidad"
              className="hover:text-brand-600 dark:hover:text-brand-400 hover:underline"
            >
              Política de Privacidad
            </Link>{' '}
            y la{' '}
            <Link
              to="/reembolsos"
              className="hover:text-brand-600 dark:hover:text-brand-400 hover:underline"
            >
              Política de Reembolsos
            </Link>
            .
          </p>
        </form>

        <button
          type="button"
          onClick={() => setDemoOpen(true)}
          className="border-carbon-200 text-carbon-600 hover:bg-carbon-50 dark:border-carbon-700 dark:text-carbon-300 dark:hover:bg-carbon-800 mt-4 w-full rounded-xl border py-2.5 text-sm font-medium transition-colors"
        >
          O prueba la demo gratis sin registrarte
        </button>

        <p className="text-carbon-400 mt-6 text-center text-xs">
          <Link to="/" className="hover:underline">
            ← Volver
          </Link>
        </p>
      </motion.div>

      <DemoEntryModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  )
}
