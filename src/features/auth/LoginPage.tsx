import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Logo } from '../../components/Logo'
import { TextField } from '../../components/ui/TextField'
import { Button } from '../../components/ui/Button'
import { signInOwner } from './api'
import { useDeviceStore } from '../../store/useDeviceStore'

const schema = z.object({
  email: z.email('Ingresa un correo válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const boundStoreId = useDeviceStore((state) => state.boundStoreId)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setServerError(null)
    try {
      await signInOwner(values.email, values.password)
      navigate('/backoffice', { replace: true })
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'No se pudo iniciar sesión')
    }
  }

  return (
    <div className="from-carbon-950 via-carbon-900 to-brand-900 flex min-h-dvh items-center justify-center bg-gradient-to-br px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="dark:bg-carbon-900 w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl"
      >
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo className="h-14 w-14" />
          <h1 className="text-carbon-900 dark:text-paper text-xl font-bold">
            Spider<span className="text-brand-600 dark:text-brand-400">POS</span>
          </h1>
          <p className="text-carbon-500 dark:text-carbon-400 text-sm">Acceso de dueño / gerente</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <TextField
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <TextField
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />

          {serverError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {serverError}
            </p>
          )}

          <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
            Entrar
          </Button>
        </form>

        {boundStoreId && (
          <p className="text-carbon-500 dark:text-carbon-400 mt-6 text-center text-sm">
            ¿Eres cajero de esta tienda?{' '}
            <Link
              to="/pin"
              className="text-brand-600 dark:text-brand-400 font-medium hover:underline"
            >
              Entra con tu PIN
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  )
}
