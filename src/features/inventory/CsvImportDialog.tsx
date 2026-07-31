import { useState } from 'react'
import Papa from 'papaparse'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { bulkImportProducts, type CsvProductRow } from './api'

interface CsvImportDialogProps {
  open: boolean
  onClose: () => void
  storeId: string
}

const EXPECTED_HEADERS = ['barcode', 'name', 'price', 'cost', 'stock', 'unit_type', 'min_stock']

export function CsvImportDialog({ open, onClose, storeId }: CsvImportDialogProps) {
  const queryClient = useQueryClient()
  const [rows, setRows] = useState<CsvProductRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')

  const importMutation = useMutation({
    mutationFn: () => bulkImportProducts(storeId, rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] })
      setRows([])
      setFileName('')
      onClose()
    },
  })

  function handleFile(file: File) {
    setFileName(file.name)
    setParseError(null)
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const headers = result.meta.fields ?? []
        const missing = EXPECTED_HEADERS.filter((h) => !headers.includes(h))
        if (missing.length > 0) {
          setParseError(`Faltan columnas: ${missing.join(', ')}`)
          setRows([])
          return
        }
        const parsed: CsvProductRow[] = result.data
          .filter((row) => (row.name ?? '').trim())
          .map((row) => ({
            barcode: (row.barcode ?? '').trim(),
            name: (row.name ?? '').trim(),
            price: Number.parseFloat(row.price ?? '') || 0,
            cost: Number.parseFloat(row.cost ?? '') || 0,
            stock: Number.parseFloat(row.stock ?? '') || 0,
            unit_type: (row.unit_type ?? '').trim() || 'piece',
            min_stock: Number.parseFloat(row.min_stock ?? '') || 0,
          }))
        setRows(parsed)
      },
      error: (err) => setParseError(err.message),
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Importar catálogo desde CSV">
      <div className="flex flex-col gap-4">
        <p className="text-carbon-500 dark:text-carbon-400 text-sm">
          Columnas requeridas: <code>{EXPECTED_HEADERS.join(', ')}</code>
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
          className="text-sm"
        />
        {fileName && (
          <p className="text-carbon-600 dark:text-carbon-300 text-sm">Archivo: {fileName}</p>
        )}
        {parseError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {parseError}
          </p>
        )}
        {rows.length > 0 && (
          <>
            <p className="text-carbon-700 dark:text-carbon-300 text-sm font-medium">
              {rows.length} productos listos para importar
            </p>
            <ul className="bg-carbon-50 dark:bg-carbon-800 max-h-40 overflow-y-auto rounded-lg p-2 text-xs">
              {rows.slice(0, 20).map((row, i) => (
                <li key={i}>
                  {row.name} — ${row.price}
                </li>
              ))}
              {rows.length > 20 && <li>... y {rows.length - 20} más</li>}
            </ul>
          </>
        )}
        {importMutation.isError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {(importMutation.error as Error).message}
          </p>
        )}
        <Button
          onClick={() => importMutation.mutate()}
          disabled={rows.length === 0}
          loading={importMutation.isPending}
          className="w-full"
        >
          Importar {rows.length > 0 ? `(${rows.length})` : ''}
        </Button>
      </div>
    </Modal>
  )
}
