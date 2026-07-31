import type { Database } from '../../lib/database/types'

type Product = Database['public']['Tables']['products']['Row']

const UNIT_LABELS: Record<string, string> = { piece: 'pza', kg: 'kg', g: 'g', lt: 'lt', m: 'm' }

export async function buildLowStockPdf(products: Product[], storeName: string): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const margin = 40
  let y = 50

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(`Lista de compras — ${storeName}`, margin, y)
  y += 20
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date().toLocaleString('es-MX'), margin, y)
  y += 24

  doc.setFont('helvetica', 'bold')
  doc.text('Producto', margin, y)
  doc.text('Stock', 340, y)
  doc.text('Mínimo', 410, y)
  doc.text('Sugerido', 490, y)
  y += 6
  doc.line(margin, y, 560, y)
  y += 16
  doc.setFont('helvetica', 'normal')

  for (const product of products) {
    if (y > 740) {
      doc.addPage()
      y = 50
    }
    const suggested = Math.max(product.min_stock * 2 - product.stock, product.min_stock)
    doc.text(product.name, margin, y, { maxWidth: 280 })
    doc.text(`${product.stock} ${UNIT_LABELS[product.unit_type]}`, 340, y)
    doc.text(`${product.min_stock}`, 410, y)
    doc.text(`${suggested.toFixed(0)} ${UNIT_LABELS[product.unit_type]}`, 490, y)
    y += 18
  }

  return doc.output('blob')
}

export function buildLowStockWhatsAppLink(products: Product[], storeName: string): string {
  const lines = [
    `*Lista de compras — ${storeName}*`,
    new Date().toLocaleDateString('es-MX'),
    '',
    ...products.map(
      (p) => `• ${p.name}: ${p.stock} ${UNIT_LABELS[p.unit_type]} (mínimo ${p.min_stock})`,
    ),
  ]
  return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`
}
