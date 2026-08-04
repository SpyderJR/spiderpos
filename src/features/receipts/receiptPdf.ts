import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import type { ReceiptData } from './types'

const UNIT_LABELS: Record<string, string> = { piece: 'pza', kg: 'kg', g: 'g', lt: 'lt', m: 'm' }
const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  credit: 'Fiado',
}

async function loadImageDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function buildReceiptPdf(data: ReceiptData): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: [320, 700] })
  const pageWidth = 320
  const margin = 24
  let y = 32

  if (data.storeLogoUrl) {
    const logoDataUrl = await loadImageDataUrl(data.storeLogoUrl)
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'PNG', pageWidth / 2 - 24, y, 48, 48)
        y += 58
      } catch {
        // formato de imagen no soportado por jsPDF (ej. SVG) — se omite
      }
    }
  }

  if (data.isCopy) {
    doc.setFontSize(11)
    doc.setTextColor(200, 50, 50)
    doc.text('*** COPIA ***', pageWidth / 2, y, { align: 'center' })
    y += 18
    doc.setTextColor(0, 0, 0)
  }

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(data.storeName, pageWidth / 2, y, { align: 'center' })
  y += 18

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  if (data.storeAddress) {
    doc.text(data.storeAddress, pageWidth / 2, y, { align: 'center' })
    y += 12
  }
  if (data.storePhone) {
    doc.text(data.storePhone, pageWidth / 2, y, { align: 'center' })
    y += 12
  }

  y += 6
  doc.setDrawColor(200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 14

  doc.setFontSize(9)
  doc.text(`Folio: ${data.folio}`, margin, y)
  y += 12
  doc.text(new Date(data.createdAt).toLocaleString('es-MX'), margin, y)
  y += 12
  doc.text(`Cajero: ${data.cashierName}`, margin, y)
  y += 12
  if (data.customerName) {
    doc.text(`Cliente: ${data.customerName}`, margin, y)
    y += 12
  }

  y += 4
  doc.line(margin, y, pageWidth - margin, y)
  y += 14

  for (const item of data.items) {
    doc.setFont('helvetica', 'normal')
    doc.text(item.name, margin, y, { maxWidth: pageWidth - margin * 2 })
    y += 12
    const qtyLabel = `${item.quantity} ${UNIT_LABELS[item.unitType]} x $${item.unitPrice.toFixed(2)}`
    doc.text(qtyLabel, margin, y)
    doc.text(`$${item.subtotal.toFixed(2)}`, pageWidth - margin, y, { align: 'right' })
    y += 14
  }

  doc.line(margin, y, pageWidth - margin, y)
  y += 14

  doc.text('Subtotal', margin, y)
  doc.text(`$${data.subtotal.toFixed(2)}`, pageWidth - margin, y, { align: 'right' })
  y += 14

  if (data.discount > 0) {
    doc.text('Descuento', margin, y)
    doc.text(`-$${data.discount.toFixed(2)}`, pageWidth - margin, y, { align: 'right' })
    y += 14
  }

  if (data.tax > 0) {
    doc.text('IVA', margin, y)
    doc.text(`$${data.tax.toFixed(2)}`, pageWidth - margin, y, { align: 'right' })
    y += 14
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('TOTAL', margin, y)
  doc.text(`$${data.total.toFixed(2)}`, pageWidth - margin, y, { align: 'right' })
  y += 18

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  for (const payment of data.payments) {
    doc.text(METHOD_LABELS[payment.method] ?? payment.method, margin, y)
    doc.text(`$${payment.amount.toFixed(2)}`, pageWidth - margin, y, { align: 'right' })
    y += 12
    if (payment.changeGiven > 0) {
      doc.text('Cambio', margin, y)
      doc.text(`$${payment.changeGiven.toFixed(2)}`, pageWidth - margin, y, { align: 'right' })
      y += 12
    }
  }

  y += 10
  const qrDataUrl = await QRCode.toDataURL(`SPIDERPOS-VERIFY:${data.saleId}`, {
    margin: 0,
    width: 96,
  })
  doc.addImage(qrDataUrl, 'PNG', pageWidth / 2 - 40, y, 80, 80)
  y += 92

  if (data.footerMessage) {
    doc.setFontSize(9)
    doc.text(data.footerMessage, pageWidth / 2, y, {
      align: 'center',
      maxWidth: pageWidth - margin * 2,
    })
    y += 16
  }

  doc.setFontSize(7)
  doc.setTextColor(150)
  doc.text('Powered by SpiderPOS', pageWidth / 2, y, { align: 'center' })

  return doc.output('blob')
}
