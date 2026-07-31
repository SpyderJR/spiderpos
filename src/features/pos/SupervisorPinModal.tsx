import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { verifySupervisorPin } from './api'
import { playErrorTone, vibrate } from './sensoryFeedback'

interface SupervisorPinModalProps {
  open: boolean
  title?: string
  onClose: () => void
  onApproved: () => void
}

export function SupervisorPinModal({
  open,
  title = 'PIN de supervisor requerido',
  onClose,
  onApproved,
}: SupervisorPinModalProps) {
  const [pin, setPin] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (pin.length < 4) return
    setChecking(true)
    setError(null)
    try {
      const approved = await verifySupervisorPin(pin)
      if (approved) {
        setPin('')
        onApproved()
      } else {
        playErrorTone()
        vibrate(200)
        setError('PIN incorrecto')
        setPin('')
      }
    } catch {
      setError('No se pudo verificar el PIN')
    } finally {
      setChecking(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-4">
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          className="border-carbon-200 text-carbon-900 focus:border-brand-500 focus:ring-brand-500/30 dark:border-carbon-700 dark:bg-carbon-900 dark:text-paper rounded-xl border bg-white px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:ring-2"
          placeholder="••••"
        />
        {error && (
          <p role="alert" className="text-center text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <Button onClick={submit} loading={checking} disabled={pin.length < 4} className="w-full">
          Autorizar
        </Button>
      </div>
    </Modal>
  )
}
