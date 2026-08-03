import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../../components/Logo'

interface LegalPageLayoutProps {
  title: string
  updatedAt: string
  children: ReactNode
}

export function LegalPageLayout({ title, updatedAt, children }: LegalPageLayoutProps) {
  return (
    <div className="bg-paper dark:bg-carbon-950 min-h-dvh">
      <header className="border-carbon-100 dark:border-carbon-800 border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <span className="text-carbon-900 dark:text-paper font-bold">
              Spider<span className="text-brand-600 dark:text-brand-400">POS</span>
            </span>
          </Link>
          <Link
            to="/"
            className="text-carbon-500 hover:text-brand-600 dark:text-carbon-400 dark:hover:text-brand-400 text-sm font-medium"
          >
            ← Volver
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-carbon-900 dark:text-paper text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="text-carbon-400 mt-1 text-sm">Última actualización: {updatedAt}</p>

        <div className="prose-legal mt-8 flex flex-col gap-6">{children}</div>
      </main>

      <footer className="border-carbon-100 dark:border-carbon-800 border-t py-8 text-center">
        <p className="text-carbon-400 text-xs">
          © {new Date().getFullYear()} SpiderPOS. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  )
}
