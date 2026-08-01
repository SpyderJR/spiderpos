import { useSettingsStore } from '../store/useSettingsStore'

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioContextClass =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return null
  audioContext ??= new AudioContextClass()
  return audioContext
}

function playTone(frequencies: number[], durationMs: number, gain = 0.12) {
  if (!useSettingsStore.getState().soundEnabled) return
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()

  const now = ctx.currentTime
  frequencies.forEach((freq, i) => {
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = freq
    const start = now + i * (durationMs / 1000)
    gainNode.gain.setValueAtTime(gain, start)
    gainNode.gain.exponentialRampToValueAtTime(0.001, start + durationMs / 1000)
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.start(start)
    oscillator.stop(start + durationMs / 1000)
  })
}

/** Tap sutil en botones/tabs — volumen bajo por diseño. */
export function playTap() {
  playTone([740], 35, 0.05)
}

/** "Pop" al agregar un producto al ticket. */
export function playPop() {
  playTone([520, 780], 45, 0.09)
}

/** Beep corto al escanear un producto. */
export function playScanBeep() {
  playTone([880], 90, 0.15)
}

/** "Cha-ching" al cobrar con éxito. */
export function playChaChing() {
  playTone([1046.5, 1318.5, 1568], 110, 0.18)
}

/** Tono de error (PIN incorrecto, stock insuficiente, etc.). */
export function playErrorTone() {
  playTone([220, 180], 140, 0.15)
}

/** Confirmación al cerrar un turno de caja. */
export function playConfirm() {
  playTone([660, 880], 90, 0.14)
}

export function vibrate(pattern: number | number[]) {
  if (!useSettingsStore.getState().hapticsEnabled) return
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}
