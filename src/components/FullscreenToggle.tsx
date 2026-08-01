import { useEffect, useState } from 'react'
import { playTap } from '../lib/sound'

export function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    function onChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  if (typeof document !== 'undefined' && !document.documentElement.requestFullscreen) {
    return null
  }

  async function toggle() {
    playTap()
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      await document.documentElement.requestFullscreen().catch(() => {
        /* el navegador puede negar el permiso — no es crítico */
      })
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Modo pantalla completa (terminal)'}
      title={isFullscreen ? 'Salir de pantalla completa' : 'Modo pantalla completa (terminal)'}
      className="border-carbon-200 text-carbon-700 hover:bg-carbon-50 dark:border-carbon-700 dark:bg-carbon-800 dark:text-carbon-200 dark:hover:bg-carbon-700 hidden min-h-11 min-w-11 items-center justify-center rounded-full border bg-white text-base transition-colors sm:flex"
    >
      <span aria-hidden="true">{isFullscreen ? '⤦' : '⤢'}</span>
    </button>
  )
}
