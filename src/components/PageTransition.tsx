import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface PageTransitionProps {
  pageKey: string
  children: ReactNode
}

/** Fade + slide sutil (180ms) al entrar a una pantalla — sin animación de
 * salida para no introducir demora al navegar en un POS donde la
 * velocidad importa. */
export function PageTransition({ pageKey, children }: PageTransitionProps) {
  return (
    <motion.div
      key={pageKey}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
