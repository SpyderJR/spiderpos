import { motion } from 'framer-motion'
import { Logo } from './components/Logo'
import { ConnectionStatus } from './components/ConnectionStatus'
import { ThemeToggle } from './components/ThemeToggle'

function App() {
  return (
    <div className="bg-paper text-carbon-900 dark:bg-carbon-950 dark:text-paper flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Logo className="h-10 w-10" />
          <span className="text-lg font-bold tracking-tight">
            Spider<span className="text-brand-600 dark:text-brand-400">POS</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionStatus />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <Logo className="mx-auto h-24 w-24" />
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Spider<span className="text-brand-600 dark:text-brand-400">POS</span>
          </h1>
          <p className="text-carbon-500 dark:text-carbon-400 mt-2 max-w-md text-balance">
            La telaraña que conecta todo tu negocio.
          </p>
        </motion.div>
      </main>

      <footer className="text-carbon-400 dark:text-carbon-500 px-4 py-4 text-center text-xs">
        Fase 0 — Fundación completada. El login y el POS llegan en las próximas fases.
      </footer>
    </div>
  )
}

export default App
