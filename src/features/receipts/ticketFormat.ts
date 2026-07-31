import type { ReceiptData } from './types'

const UNIT_LABELS: Record<string, string> = { piece: 'pza', kg: 'kg', g: 'g', lt: 'lt', m: 'm' }
const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  credit: 'Fiado',
}

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function center(text: string, width: number): string {
  const t = text.length > width ? text.slice(0, width) : text
  const padTotal = width - t.length
  const left = Math.floor(padTotal / 2)
  return ' '.repeat(Math.max(0, left)) + t
}

function twoColumns(left: string, right: string, width: number): string {
  const maxLeft = width - right.length - 1
  const l = left.length > maxLeft ? left.slice(0, maxLeft) : left
  const gap = width - l.length - right.length
  return l + ' '.repeat(Math.max(1, gap)) + right
}

function money(n: number): string {
  return `$${n.toFixed(2)}`
}

/**
 * Compone el ticket como líneas de texto monoespaciado, para impresión
 * térmica ESC/POS (58mm ≈ 32 columnas, 80mm ≈ 48 columnas).
 */
export function composeTicketLines(data: ReceiptData, width: 32 | 48): string[] {
  const lines: string[] = []
  const rule = '-'.repeat(width)

  if (data.isCopy) {
    lines.push(center('*** COPIA ***', width))
    lines.push('')
  }

  lines.push(center(stripAccents(data.storeName), width))
  if (data.storeAddress) lines.push(center(stripAccents(data.storeAddress), width))
  if (data.storePhone) lines.push(center(data.storePhone, width))
  lines.push(rule)
  lines.push(`Folio: ${data.folio}`)
  lines.push(new Date(data.createdAt).toLocaleString('es-MX'))
  lines.push(`Cajero: ${stripAccents(data.cashierName)}`)
  if (data.customerName) lines.push(`Cliente: ${stripAccents(data.customerName)}`)
  lines.push(rule)

  for (const item of data.items) {
    lines.push(stripAccents(item.name).slice(0, width))
    const qty = `${item.quantity} ${UNIT_LABELS[item.unitType]} x ${money(item.unitPrice)}`
    lines.push(twoColumns(qty, money(item.subtotal), width))
  }

  lines.push(rule)
  lines.push(twoColumns('Subtotal', money(data.subtotal), width))
  if (data.discount > 0) lines.push(twoColumns('Descuento', `-${money(data.discount)}`, width))
  lines.push(twoColumns('TOTAL', money(data.total), width))
  lines.push(rule)

  for (const payment of data.payments) {
    lines.push(
      twoColumns(
        stripAccents(METHOD_LABELS[payment.method] ?? payment.method),
        money(payment.amount),
        width,
      ),
    )
    if (payment.changeGiven > 0) {
      lines.push(twoColumns('Cambio', money(payment.changeGiven), width))
    }
  }

  if (data.footerMessage) {
    lines.push(rule)
    lines.push(center(stripAccents(data.footerMessage), width))
  }

  lines.push('')
  lines.push(center('Powered by SpiderPOS', width))
  lines.push('')

  return lines
}

export function buildWhatsAppMessage(data: ReceiptData): string {
  const lines = [
    `*${data.storeName}*`,
    data.isCopy ? '_(copia de ticket)_' : '',
    `Folio: ${data.folio}`,
    new Date(data.createdAt).toLocaleString('es-MX'),
    '',
    ...data.items.map(
      (item) =>
        `${item.quantity} ${UNIT_LABELS[item.unitType]} ${item.name} — ${money(item.subtotal)}`,
    ),
    '',
    `Total: *${money(data.total)}*`,
  ]
  if (data.footerMessage) lines.push('', data.footerMessage)
  return lines.filter((l) => l !== '' || true).join('\n')
}

export function buildWhatsAppLink(data: ReceiptData, phone?: string): string {
  const text = encodeURIComponent(buildWhatsAppMessage(data))
  const digits = phone?.replace(/\D/g, '')
  return digits ? `https://wa.me/52${digits}?text=${text}` : `https://wa.me/?text=${text}`
}
