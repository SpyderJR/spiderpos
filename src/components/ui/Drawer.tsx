import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/** Panel lateral deslizable — mismo propósito que Modal pero anclado al
 * borde derecho, para detalle de registros (venta, cliente, etc.) sin
 * perder de vista la lista de origen. */
export function Drawer({ open, onClose, title, children }: DrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
            className="dark:bg-carbon-900 flex h-dvh w-full max-w-md flex-col overflow-y-auto bg-white shadow-[var(--shadow-floating)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-carbon-100 dark:border-carbon-800 dark:bg-carbon-900/90 sticky top-0 z-10 flex items-center justify-between border-b bg-white/90 px-5 py-4 backdrop-blur-sm">
              <h2 className="text-carbon-900 dark:text-paper text-lg font-bold">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="text-carbon-400 hover:bg-carbon-100 dark:hover:bg-carbon-800 flex h-9 w-9 items-center justify-center rounded-full"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
