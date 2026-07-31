import { useEffect, useRef } from 'react'

const FAST_KEY_THRESHOLD_MS = 60
const MIN_CODE_LENGTH = 3

/**
 * Pistolas lectoras USB/Bluetooth operan en modo teclado (HID): "tipean" el
 * código a gran velocidad y rematan con Enter. Este hook distingue esas
 * ráfagas de la escritura humana por el tiempo entre teclas.
 */
export function useHidScanner(onScan: (code: string) => void, enabled = true) {
  const bufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)

  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(event: KeyboardEvent) {
      const now = performance.now()
      const elapsed = now - lastKeyTimeRef.current
      lastKeyTimeRef.current = now

      if (event.key === 'Enter') {
        const code = bufferRef.current
        bufferRef.current = ''
        if (code.length >= MIN_CODE_LENGTH) {
          onScan(code)
        }
        return
      }

      if (elapsed > FAST_KEY_THRESHOLD_MS) {
        bufferRef.current = ''
      }

      if (event.key.length === 1) {
        bufferRef.current += event.key
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onScan, enabled])
}
