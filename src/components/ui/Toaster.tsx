import { AnimatePresence, motion } from 'framer-motion'
import { useToastStore } from '../../store/useToastStore'

const TONE_CLASSES = {
  success: 'border-emerald-500/40 bg-emerald-600 text-white',
  error: 'border-red-500/40 bg-red-600 text-white',
  info: 'border-carbon-700 bg-carbon-900 text-white',
}

const TONE_ICON = { success: '✅', error: '⚠️', info: 'ℹ️' }

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)
  const dismiss = useToastStore((state) => state.dismiss)

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto flex max-w-sm items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-[var(--shadow-floating)] ${TONE_CLASSES[t.tone]}`}
          >
            <span aria-hidden="true">{TONE_ICON[t.tone]}</span>
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
