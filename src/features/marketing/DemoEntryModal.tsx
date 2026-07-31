import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { enterDemo } from './demoApi'

interface DemoEntryModalProps {
  open: boolean
  onClose: () => void
}

export function DemoEntryModal({ open, onClose }: DemoEntryModalProps) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

  const mutation = useMutation({
    mutationFn: () => enterDemo(email.trim() || undefined),
    onSuccess: () => navigate('/backoffice/venta', { replace: true }),
  })

  return (
    <Modal open={open} onClose={onClose} title="Probar demo gratis">
      <div className="flex flex-col gap-4">
        <p className="text-carbon-500 dark:text-carbon-400 text-sm">
          Entra a una tienda de ejemplo ya cargada con productos reales. Sin tarjeta, sin cuenta —
          explora el POS, cobra, revisa reportes. Los datos se reinician todos los días.
        </p>
        <input
          type="email"
          placeholder="Tu correo (opcional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 rounded-xl border px-4 py-2.5 text-sm"
        />
        {mutation.isError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {mutation.error instanceof Error ? mutation.error.message : 'No se pudo entrar'}
          </p>
        )}
        <Button onClick={() => mutation.mutate()} loading={mutation.isPending} className="w-full">
          Entrar a la demo
        </Button>
      </div>
    </Modal>
  )
}
