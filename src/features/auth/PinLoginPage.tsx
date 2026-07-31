import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Logo } from '../../components/Logo'
import { Button } from '../../components/ui/Button'
import { pinLogin } from './api'
import { useDeviceStore } from '../../store/useDeviceStore'

const MAX_PIN_LENGTH = 6
const MIN_PIN_LENGTH = 4
const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

export function PinLoginPage() {
  const navigate = useNavigate()
  const boundStoreId = useDeviceStore((state) => state.boundStoreId)
  const unbindStore = useDeviceStore((state) => state.unbindStore)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!boundStoreId) {
    return <Navigate to="/login" replace />
  }

  function pressKey(key: string) {
    if (submitting) return
    setError(null)
    if (key === '⌫') {
      setPin((prev) => prev.slice(0, -1))
      return
    }
    if (key === '') return
    setPin((prev) => (prev.length < MAX_PIN_LENGTH ? prev + key : prev))
  }

  async function submit() {
    if (pin.length < MIN_PIN_LENGTH || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await pinLogin(boundStoreId!, pin)
      navigate('/backoffice', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión')
      setPin('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="from-carbon-950 via-carbon-900 to-brand-900 flex min-h-dvh flex-col items-center justify-center gap-6 bg-gradient-to-br px-4 py-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <Logo className="h-14 w-14" />
        <h1 className="text-paper text-xl font-bold">
          Spider<span className="text-brand-400">POS</span>
        </h1>
        <p className="text-carbon-400 text-sm">Ingresa tu PIN de empleado</p>
      </div>

      <div className="flex gap-3" aria-live="polite">
        {Array.from({ length: MAX_PIN_LENGTH }).map((_, i) => (
          <motion.span
            key={i}
            animate={{ scale: i < pin.length ? 1 : 0.85 }}
            className={`border-brand-400 h-4 w-4 rounded-full border-2 ${
              i < pin.length ? 'bg-brand-400' : 'bg-transparent'
            }`}
          />
        ))}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {KEYPAD_KEYS.map((key, i) => (
          <button
            key={i}
            type="button"
            disabled={key === '' || submitting}
            onClick={() => pressKey(key)}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-2xl font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-0"
          >
            {key}
          </button>
        ))}
      </div>

      <Button
        type="button"
        onClick={submit}
        loading={submitting}
        disabled={pin.length < MIN_PIN_LENGTH}
        className="w-48"
      >
        Entrar
      </Button>

      <button
        type="button"
        onClick={() => {
          unbindStore()
          navigate('/login', { replace: true })
        }}
        className="text-carbon-400 text-sm hover:underline"
      >
        ¿No eres de esta tienda? Inicia con tu correo
      </button>
    </div>
  )
}
