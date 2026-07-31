import type { ReportData } from './api'

const UTF8_BOM = String.fromCharCode(0xfeff)

export function exportSalesCsv(data: ReportData, storeName: string) {
  const header = ['Folio', 'Fecha', 'Empleado', 'Total']
  const rows = data.rawSales.map((s) => [
    s.id.slice(0, 8).toUpperCase(),
    new Date(s.client_created_at).toLocaleString('es-MX'),
    s.store_members?.full_name ?? 'N/D',
    s.total.toFixed(2),
  ])
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
  const blob = new Blob([UTF8_BOM + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ventas-${storeName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
