// Paleta categórica validada (dataviz skill) — orden fijo, nunca ciclada.
// Contraste de OKLab confirmado para los 4 primeros slots (uso all-pairs).
export const CATEGORICAL_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300']
export const CATEGORICAL_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300']

// Hue secuencial único para magnitud (ranking de un solo valor).
export const SEQUENTIAL_LIGHT = '#2a78d6'
export const SEQUENTIAL_DARK = '#3987e5'

export const CHART_INK_LIGHT = {
  primary: '#0b0b0b',
  secondary: '#52514e',
  muted: '#898781',
  grid: '#e1e0d9',
}
export const CHART_INK_DARK = {
  primary: '#ffffff',
  secondary: '#c3c2b7',
  muted: '#898781',
  grid: '#2c2c2a',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  credit: 'Fiado',
}
export const PAYMENT_METHOD_ORDER = ['cash', 'card', 'transfer', 'credit']
