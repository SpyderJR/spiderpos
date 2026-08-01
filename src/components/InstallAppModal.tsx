import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { useInstallPrompt } from '../lib/useInstallPrompt'

interface InstallAppModalProps {
  open: boolean
  onClose: () => void
}

export function InstallAppModal({ open, onClose }: InstallAppModalProps) {
  const { canPromptInstall, isIos, installed, promptInstall } = useInstallPrompt()

  return (
    <Modal open={open} onClose={onClose} title="Instala SpiderPOS en tu celular">
      <div className="flex flex-col gap-4">
        {installed ? (
          <p className="text-carbon-600 dark:text-carbon-300 text-center text-sm">
            ✅ Ya tienes SpiderPOS instalado en este dispositivo.
          </p>
        ) : canPromptInstall ? (
          <>
            <p className="text-carbon-600 dark:text-carbon-300 text-sm">
              Se instala como una app real: ícono en tu pantalla de inicio, abre a pantalla
              completa, sin barra del navegador — y sigue funcionando sin internet.
            </p>
            <Button onClick={() => promptInstall()} className="w-full">
              Instalar ahora
            </Button>
          </>
        ) : isIos ? (
          <ol className="text-carbon-700 dark:text-carbon-300 flex flex-col gap-3 text-sm">
            <li className="flex gap-3">
              <span className="bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                1
              </span>
              Abre esta página en <strong>Safari</strong> (no funciona desde otras apps).
            </li>
            <li className="flex gap-3">
              <span className="bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                2
              </span>
              Toca el ícono de <strong>Compartir</strong> (el cuadro con la flecha hacia arriba,
              abajo en la barra).
            </li>
            <li className="flex gap-3">
              <span className="bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                3
              </span>
              Busca y toca <strong>"Agregar a pantalla de inicio"</strong>.
            </li>
            <li className="flex gap-3">
              <span className="bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                4
              </span>
              Toca <strong>"Agregar"</strong> — listo, ya tienes el ícono en tu pantalla.
            </li>
          </ol>
        ) : (
          <p className="text-carbon-600 dark:text-carbon-300 text-sm">
            Busca la opción <strong>"Instalar app"</strong> o{' '}
            <strong>"Agregar a pantalla de inicio"</strong> en el menú de tu navegador (⋮ o ⋯,
            usualmente arriba a la derecha).
          </p>
        )}
      </div>
    </Modal>
  )
}
