import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import type { ReceiptData } from './types'
import { buildWhatsAppLink } from './ticketFormat'
import { getSavedPrinterConfig, printReceipt } from './thermalPrinter'
import { PrinterSettingsModal } from './PrinterSettingsModal'

interface ReceiptActionsProps {
  data: ReceiptData
}

export function ReceiptActions({ data }: ReceiptActionsProps) {
  const [printing, setPrinting] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [printerModalOpen, setPrinterModalOpen] = useState(false)
  const [phone, setPhone] = useState('')

  async function handlePrint() {
    const config = getSavedPrinterConfig()
    if (!config) {
      setPrinterModalOpen(true)
      return
    }
    setPrinting(true)
    setError(null)
    try {
      await printReceipt(data, config)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo imprimir')
    } finally {
      setPrinting(false)
    }
  }

  async function handlePdf() {
    setGeneratingPdf(true)
    setError(null)
    try {
      // jsPDF pesa bastante — se carga solo al pedir el PDF.
      const { buildReceiptPdf } = await import('./receiptPdf')
      const blob = await buildReceiptPdf(data)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ticket-${data.folio}${data.isCopy ? '-copia' : ''}.pdf`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch {
      setError('No se pudo generar el PDF')
    } finally {
      setGeneratingPdf(false)
    }
  }

  function handleWhatsApp() {
    window.open(buildWhatsAppLink(data, phone || undefined), '_blank', 'noopener')
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <Button variant="secondary" onClick={handlePrint} loading={printing}>
          🖨️ Imprimir
        </Button>
        <Button variant="secondary" onClick={handlePdf} loading={generatingPdf}>
          📄 PDF
        </Button>
        <Button variant="secondary" onClick={handleWhatsApp}>
          💬 WhatsApp
        </Button>
      </div>
      <input
        type="tel"
        placeholder="Teléfono del cliente (opcional)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 rounded-lg border px-3 py-2 text-sm"
      />
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <PrinterSettingsModal open={printerModalOpen} onClose={() => setPrinterModalOpen(false)} />
    </div>
  )
}
