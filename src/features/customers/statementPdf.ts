import type { StatementEntry } from './api'
import type { Database } from '../../lib/database/types'

type Customer = Database['public']['Tables']['customers']['Row']

export async function buildStatementPdf(
  customer: Customer,
  entries: StatementEntry[],
  storeName: string,
): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const margin = 40
  let y = 50

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(`Estado de cuenta — ${storeName}`, margin, y)
  y += 22
  doc.setFontSize(12)
  doc.text(customer.name, margin, y)
  y += 16
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  if (customer.phone) {
    doc.text(customer.phone, margin, y)
    y += 14
  }
  doc.text(new Date().toLocaleString('es-MX'), margin, y)
  y += 24

  doc.setFont('helvetica', 'bold')
  doc.text('Fecha', margin, y)
  doc.text('Descripción', margin + 80, y)
  doc.text('Monto', 500, y, { align: 'right' })
  y += 6
  doc.line(margin, y, 560, y)
  y += 16
  doc.setFont('helvetica', 'normal')

  for (const entry of entries) {
    if (y > 740) {
      doc.addPage()
      y = 50
    }
    doc.text(new Date(entry.date).toLocaleDateString('es-MX'), margin, y)
    doc.text(entry.description, margin + 80, y, { maxWidth: 300 })
    doc.text(`${entry.amount < 0 ? '-' : ''}$${Math.abs(entry.amount).toFixed(2)}`, 500, y, {
      align: 'right',
    })
    y += 16
  }

  y += 10
  doc.line(margin, y, 560, y)
  y += 20
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Saldo actual', margin, y)
  doc.text(`$${customer.credit_balance.toFixed(2)}`, 500, y, { align: 'right' })
  y += 18
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Límite de crédito: $${customer.credit_limit.toFixed(2)}`, margin, y)

  return doc.output('blob')
}

export function buildCollectionWhatsAppLink(customer: Customer, storeName: string): string {
  const lines = [
    `Hola ${customer.name}, te saludamos de *${storeName}*.`,
    '',
    `Tu saldo pendiente es de *$${customer.credit_balance.toFixed(2)}*.`,
    `Límite de crédito autorizado: $${customer.credit_limit.toFixed(2)}.`,
    '',
    'Te agradecemos ponerte al corriente cuando puedas. ¡Gracias por tu preferencia!',
  ]
  const digits = customer.phone?.replace(/\D/g, '')
  const text = encodeURIComponent(lines.join('\n'))
  return digits ? `https://wa.me/52${digits}?text=${text}` : `https://wa.me/?text=${text}`
}
