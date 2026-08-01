import type { Side } from 'driver.js'

export interface TourStop {
  id: string
  route: string
  selector: string
  /** En móvil, este elemento vive detrás del menú "Más" — hay que abrirlo antes de buscarlo. */
  mobileMenu?: boolean
  title: string
  description: string
  side: Side
}

/**
 * Los 7 puntos de contenido del tour guiado. El cierre (con confetti) se
 * arma aparte en useProductTour porque su copy depende de si es la tienda
 * demo o un cliente real — ver TOUR_CLOSING_ID.
 */
export const TOUR_STOPS: TourStop[] = [
  {
    id: 'venta',
    route: '/backoffice/venta',
    selector: '[data-tour="pos-catalog"]',
    title: 'Así es tu pantalla de venta',
    description:
      'Aquí ves tus productos y armas el ticket. Todo lo que necesitas para cobrar está a la mano.',
    side: 'right',
  },
  {
    id: 'busqueda',
    route: '/backoffice/venta',
    selector: '[data-tour="pos-search"]',
    title: 'Busca o escanea',
    description:
      'Escribe el nombre del producto o toca la cámara para escanear el código de barras. También funciona con lector de pistola.',
    side: 'bottom',
  },
  {
    id: 'cobrar',
    route: '/backoffice/venta',
    selector: '[data-tour="pos-cobrar"]',
    title: 'Cobra en un toque',
    description:
      'Cuando el ticket esté listo, toca aquí. Si pagan en efectivo, calculamos el cambio solos. También aceptamos tarjeta y fiado.',
    side: 'left',
  },
  {
    id: 'inventario',
    route: '/backoffice/inventario',
    selector: '[data-tour="nav-inventario"]',
    title: 'Tu inventario, siempre al día',
    description:
      'Da de alta productos, controla tu stock y recibe alertas cuando algo se esté agotando.',
    side: 'right',
  },
  {
    id: 'clientes',
    route: '/backoffice/clientes',
    selector: '[data-tour="nav-clientes"]',
    title: 'Clientes y fiados',
    description: 'Lleva la cuenta de quién te debe, cuánto y desde cuándo — sin libretas de papel.',
    side: 'right',
  },
  {
    id: 'caja',
    route: '/backoffice/caja',
    selector: '[data-tour="nav-caja"]',
    title: 'Corte de caja',
    description:
      'Al abrir y cerrar turno, cuenta tu efectivo y nosotros calculamos si sobra o falta.',
    side: 'right',
  },
  {
    id: 'reportes',
    route: '/backoffice/reportes',
    selector: '[data-tour="nav-reportes"]',
    mobileMenu: true,
    title: 'Reportes para decidir mejor',
    description:
      'Ventas por hora, por empleado, tus productos más vendidos y tu ganancia real — todo en un solo lugar.',
    side: 'right',
  },
]

export const TOUR_CLOSING_ID = 'cierre'
