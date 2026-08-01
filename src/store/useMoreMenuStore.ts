import { create } from 'zustand'

interface MoreMenuState {
  open: boolean
  setOpen: (open: boolean) => void
}

/** Compartido entre BackofficeLayout y el tour guiado — el tour necesita
 * poder abrir el menú "Más" en móvil para señalar Reportes, que ahí vive
 * detrás de ese menú en vez de la barra inferior. */
export const useMoreMenuStore = create<MoreMenuState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))
