import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Logo } from '../../components/Logo'
import { Button } from '../../components/ui/Button'
import { pinLogin, listActiveStaff, type ActiveStaffMember } from './api'
import { useDeviceStore } from '../../store/useDeviceStore'
import { playTap, playErrorTone, vibrate } from '../../lib/sound'

const MAX_PIN_LENGTH = 6
const MIN_PIN_LENGTH = 4
const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

const ROLE_LABELS: Record<string, string> = {
  owner: 'Dueño',
  manager: 'Gerente',
  cashier: 'Cajero',
}

const AVATAR_GRADIENTS = [
  'from-violet-500 to-brand-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-sky-500 to-blue-600',
  'from-pink-500 to-rose-600',
]

function avatarGradient(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length]
}

export function PinLoginPage() {
  const navigate = useNavigate()
  const boundStoreId = useDeviceStore((state) => state.boundStoreId)
  const unbindStore = useDeviceStore((state) => state.unbindStore)
  const [selectedEmployee, setSelectedEmployee] = useState<ActiveStaffMember | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const staffQuery = useQuery({
    queryKey: ['active-staff', boundStoreId],
    queryFn: () => listActiveStaff(boundStoreId!),
    enabled: !!boundStoreId,
  })

  if (!boundStoreId) {
    return <Navigate to="/login" replace />
  }

  function pressKey(key: string) {
    if (submitting) return
    setError(null)
    playTap()
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
      playErrorTone()
      vibrate(200)
      setShake(true)
      setTimeout(() => setShake(false), 400)
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión')
      setPin('')
    } finally {
      setSubmitting(false)
    }
  }

  const showKeypad = !!selectedEmployee || staffQuery.data?.length === 0 || staffQuery.isError

  return (
    <div className="from-carbon-950 via-carbon-900 to-brand-900 flex min-h-dvh flex-col items-center justify-center gap-6 bg-gradient-to-br px-4 py-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <Logo className="h-14 w-14" />
        <h1 className="text-paper text-xl font-bold">
          Spider<span className="text-brand-400">POS</span>
        </h1>
      </div>

      <AnimatePresence mode="wait">
        {!showKeypad ? (
          <motion.div
            key="picker"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
            className="flex w-full max-w-sm flex-col items-center gap-4"
          >
            <p className="text-carbon-300 text-sm">¿Quién eres?</p>
            <div className="grid grid-cols-3 gap-4">
              {staffQuery.data?.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => {
                    playTap()
                    setSelectedEmployee(member)
                  }}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span
                    className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br text-2xl font-bold text-white transition-transform active:scale-90 ${avatarGradient(member.id)}`}
                  >
                    {member.full_name.charAt(0).toUpperCase()}
                  </span>
                  <span className="max-w-[5rem] truncate text-xs font-medium text-white/90">
                    {member.full_name.split(' ')[0]}
                  </span>
                  <span className="text-[10px] text-white/50">{ROLE_LABELS[member.role]}</span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="keypad"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col items-center gap-6"
          >
            {selectedEmployee && (
              <div className="flex flex-col items-center gap-2">
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br text-xl font-bold text-white ${avatarGradient(selectedEmployee.id)}`}
                >
                  {selectedEmployee.full_name.charAt(0).toUpperCase()}
                </span>
                <p className="text-sm text-white/90">
                  Hola, <span className="font-semibold">{selectedEmployee.full_name}</span>
                </p>
              </div>
            )}
            <p className="text-carbon-400 text-sm">Ingresa tu PIN</p>

            <motion.div
              className="flex gap-3"
              aria-live="polite"
              animate={shake ? { x: [0, -8, 8, -8, 8, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
            >
              {Array.from({ length: MAX_PIN_LENGTH }).map((_, i) => (
                <motion.span
                  key={i}
                  animate={{ scale: i < pin.length ? 1 : 0.85 }}
                  className={`border-brand-400 h-4 w-4 rounded-full border-2 ${
                    i < pin.length ? 'bg-brand-400' : 'bg-transparent'
                  }`}
                />
              ))}
            </motion.div>

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
                  className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-2xl font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-90 disabled:opacity-0"
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

            {staffQuery.data && staffQuery.data.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedEmployee(null)
                  setPin('')
                  setError(null)
                }}
                className="text-carbon-400 text-sm hover:underline"
              >
                ← No soy yo
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
