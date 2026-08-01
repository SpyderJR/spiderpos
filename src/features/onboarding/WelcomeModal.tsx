import { motion, AnimatePresence } from 'framer-motion'
import { Logo } from '../../components/Logo'
import { Button } from '../../components/ui/Button'

interface WelcomeModalProps {
  open: boolean
  isDemo: boolean
  onStartTour: () => void
  onDismiss: () => void
}

export function WelcomeModal({ open, isDemo, onStartTour, onDismiss }: WelcomeModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Bienvenida"
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            className="dark:bg-carbon-900 relative w-full max-w-md overflow-hidden rounded-t-2xl bg-white p-8 text-center shadow-2xl sm:rounded-2xl"
          >
            <div className="from-brand-100 to-brand-50 dark:from-brand-900/40 dark:to-carbon-900 absolute inset-x-0 top-0 -z-0 h-32 bg-gradient-to-b" />
            <motion.div
              initial={{ scale: 0.6, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
              className="relative z-10 mx-auto mb-4 flex h-16 w-16 items-center justify-center"
            >
              <Logo className="h-16 w-16" />
            </motion.div>

            <h2 className="text-carbon-900 dark:text-paper relative z-10 text-xl font-bold text-balance">
              {isDemo
                ? '¡Bienvenido a la demo de SpiderPOS!'
                : '¡Gracias por confiar en SpiderPOS!'}
            </h2>
            <p className="text-carbon-500 dark:text-carbon-300 relative z-10 mt-2 text-sm text-balance">
              {isDemo
                ? 'Esta es una tienda de ejemplo, ya cargada con productos reales. Explora libremente — nada de lo que hagas aquí afecta a un negocio real.'
                : 'Tu suscripción quedó activa y tu tienda ya está lista. Vamos a enseñarte lo esencial para que hagas tu primera venta en minutos.'}
            </p>

            <div className="relative z-10 mt-6 flex flex-col gap-2">
              <Button onClick={onStartTour} className="w-full">
                {isDemo ? 'Ver cómo funciona (2 min)' : 'Empezar el tour guiado'}
              </Button>
              <Button variant="ghost" onClick={onDismiss} className="w-full">
                {isDemo ? 'Explorar por mi cuenta' : 'Prefiero explorar solo'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
