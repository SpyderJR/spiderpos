import { useThemeStore } from '../store/useThemeStore'

interface LogoProps {
  className?: string
}

export function Logo({ className }: LogoProps) {
  const theme = useThemeStore((state) => state.theme)
  const src = theme === 'dark' ? '/fotos/logo-arana-dark.svg' : '/fotos/logo-arana.svg'

  return <img src={src} alt="SpiderPOS" className={className} width={64} height={64} />
}
