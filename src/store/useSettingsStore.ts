import { create } from 'zustand'

const STORAGE_KEY = 'spiderpos-settings'

interface Settings {
  soundEnabled: boolean
  hapticsEnabled: boolean
}

interface SettingsState extends Settings {
  toggleSound: () => void
  toggleHaptics: () => void
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { soundEnabled: true, hapticsEnabled: true, ...JSON.parse(raw) }
  } catch {
    // localStorage inaccesible (modo privado, etc.) — usar defaults
  }
  return { soundEnabled: true, hapticsEnabled: true }
}

function persist(settings: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...loadSettings(),
  toggleSound: () => {
    const next = { soundEnabled: !get().soundEnabled, hapticsEnabled: get().hapticsEnabled }
    persist(next)
    set(next)
  },
  toggleHaptics: () => {
    const next = { soundEnabled: get().soundEnabled, hapticsEnabled: !get().hapticsEnabled }
    persist(next)
    set(next)
  },
}))
