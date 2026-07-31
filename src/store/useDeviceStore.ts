import { create } from 'zustand'

const STORAGE_KEY = 'spiderpos-device-store-id'

interface DeviceState {
  boundStoreId: string | null
  bindStore: (storeId: string) => void
  unbindStore: () => void
}

export const useDeviceStore = create<DeviceState>((set) => ({
  boundStoreId: localStorage.getItem(STORAGE_KEY),
  bindStore: (storeId) => {
    localStorage.setItem(STORAGE_KEY, storeId)
    set({ boundStoreId: storeId })
  },
  unbindStore: () => {
    localStorage.removeItem(STORAGE_KEY)
    set({ boundStoreId: null })
  },
}))
