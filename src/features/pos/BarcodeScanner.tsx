import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { Modal } from '../../components/ui/Modal'

interface BarcodeDetectorResult {
  rawValue: string
}

interface BarcodeDetectorLike {
  detect: (source: HTMLVideoElement) => Promise<BarcodeDetectorResult[]>
}

type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike

interface ScannerWindow extends Window {
  BarcodeDetector?: BarcodeDetectorConstructor
}

interface BarcodeScannerProps {
  open: boolean
  onClose: () => void
  onDetect: (code: string) => void
}

const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code']

export function BarcodeScanner({ open, onClose, onDetect }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    let stream: MediaStream | null = null
    let pollId: ReturnType<typeof setInterval> | null = null
    let zxingControls: { stop: () => void } | null = null

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (cancelled || !videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()

        const detectorCtor = (window as ScannerWindow).BarcodeDetector

        if (detectorCtor) {
          const detector = new detectorCtor({ formats: NATIVE_FORMATS })
          pollId = setInterval(async () => {
            if (!videoRef.current || cancelled) return
            try {
              const results = await detector.detect(videoRef.current)
              if (results.length > 0 && !cancelled) {
                onDetect(results[0]!.rawValue)
              }
            } catch {
              // frame ilegible, se reintenta en el próximo tick
            }
          }, 250)
        } else {
          const reader = new BrowserMultiFormatReader()
          const controls = await reader.decodeFromVideoElement(videoRef.current, (result) => {
            if (result && !cancelled) {
              onDetect(result.getText())
            }
          })
          zxingControls = controls
        }
      } catch {
        if (!cancelled)
          setError('No se pudo acceder a la cámara. Revisa los permisos del navegador.')
      }
    }

    start()

    return () => {
      cancelled = true
      if (pollId) clearInterval(pollId)
      zxingControls?.stop()
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [open, onDetect])

  return (
    <Modal open={open} onClose={onClose} title="Escanear código de barras">
      <div className="flex flex-col gap-3">
        {error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
          </div>
        )}
        <p className="text-carbon-500 dark:text-carbon-400 text-center text-sm">
          Apunta la cámara al código de barras del producto.
        </p>
      </div>
    </Modal>
  )
}
