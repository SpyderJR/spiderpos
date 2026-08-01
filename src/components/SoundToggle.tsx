import { useSettingsStore } from '../store/useSettingsStore'
import { playTap } from '../lib/sound'

export function SoundToggle() {
  const soundEnabled = useSettingsStore((state) => state.soundEnabled)
  const toggleSound = useSettingsStore((state) => state.toggleSound)

  return (
    <button
      type="button"
      onClick={() => {
        toggleSound()
        if (!soundEnabled) playTap()
      }}
      aria-label={soundEnabled ? 'Silenciar sonidos' : 'Activar sonidos'}
      aria-pressed={soundEnabled}
      className="border-carbon-200 text-carbon-700 hover:bg-carbon-50 dark:border-carbon-700 dark:bg-carbon-800 dark:text-carbon-200 dark:hover:bg-carbon-700 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border bg-white text-base transition-colors"
    >
      <span aria-hidden="true">{soundEnabled ? '🔊' : '🔇'}</span>
    </button>
  )
}
