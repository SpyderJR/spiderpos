import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import {
  connectBluetoothPrinter,
  connectSerialPrinter,
  getSavedPrinterConfig,
  savePrinterConfig,
  clearPrinterConfig,
  testPrint,
  type PrinterConfig,
  type PaperWidth,
} from './thermalPrinter'

interface PrinterSettingsModalProps {
  open: boolean
  onClose: () => void
}

export function PrinterSettingsModal({ open, onClose }: PrinterSettingsModalProps) {
  const [config, setConfig] = useState<PrinterConfig | null>(getSavedPrinterConfig())
  const [busy, setBusy] = useState<'bluetooth' | 'serial' | 'test' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function connect(transport: 'bluetooth' | 'serial') {
    setBusy(transport)
    setError(null)
    setMessage(null)
    try {
      const newConfig =
        transport === 'bluetooth' ? await connectBluetoothPrinter() : await connectSerialPrinter()
      setConfig(newConfig)
      setMessage('Impresora vinculada. Prueba la impresión antes de cerrar.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo vincular la impresora')
    } finally {
      setBusy(null)
    }
  }

  function updatePaperWidth(paperWidth: PaperWidth) {
    if (!config) return
    const updated = { ...config, paperWidth }
    savePrinterConfig(updated)
    setConfig(updated)
  }

  async function runTestPrint() {
    if (!config) return
    setBusy('test')
    setError(null)
    setMessage(null)
    try {
      await testPrint(config)
      setMessage('Ticket de prueba enviado.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo imprimir')
    } finally {
      setBusy(null)
    }
  }

  function forget() {
    clearPrinterConfig()
    setConfig(null)
    setMessage(null)
  }

  return (
    <Modal open={open} onClose={onClose} title="Impresora térmica">
      <div className="flex flex-col gap-4">
        {config ? (
          <div className="bg-carbon-50 dark:bg-carbon-800 rounded-xl p-4">
            <p className="text-carbon-900 dark:text-paper font-medium">{config.deviceName}</p>
            <p className="text-carbon-500 dark:text-carbon-400 text-sm">
              {config.transport === 'bluetooth' ? 'Bluetooth' : 'USB / Serial'}
            </p>
            <div className="mt-3 flex gap-2">
              {(['58mm', '80mm'] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => updatePaperWidth(w)}
                  className={`min-h-11 rounded-lg px-3 text-sm font-medium ${
                    config.paperWidth === w
                      ? 'bg-brand-600 text-white'
                      : 'text-carbon-700 dark:bg-carbon-900 dark:text-carbon-200 bg-white'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" onClick={forget} className="flex-1">
                Olvidar
              </Button>
              <Button onClick={runTestPrint} loading={busy === 'test'} className="flex-1">
                Imprimir prueba
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-carbon-500 dark:text-carbon-400 text-sm">
            Ninguna impresora vinculada en este dispositivo.
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {message && <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>}

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            loading={busy === 'bluetooth'}
            onClick={() => connect('bluetooth')}
          >
            🔵 Bluetooth
          </Button>
          <Button variant="secondary" loading={busy === 'serial'} onClick={() => connect('serial')}>
            🔌 USB
          </Button>
        </div>
      </div>
    </Modal>
  )
}
