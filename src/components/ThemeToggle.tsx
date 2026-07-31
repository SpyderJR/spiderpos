import { useThemeStore } from '../store/useThemeStore'

export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="border-carbon-200 text-carbon-700 hover:bg-carbon-50 dark:border-carbon-700 dark:bg-carbon-800 dark:text-carbon-200 dark:hover:bg-carbon-700 inline-flex min-w-11 items-center justify-center gap-1 rounded-full border bg-white px-3 text-sm font-medium transition-colors"
    >
      <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
      <span className="hidden sm:inline">{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
    </button>
  )
}
