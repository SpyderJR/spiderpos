import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCurrentMember } from '../auth/useCurrentMember'
import { Button } from '../../components/ui/Button'
import { listProducts, listLowStockProducts } from './api'
import { ProductFormDialog } from './ProductFormDialog'
import { StockAdjustDialog } from './StockAdjustDialog'
import { CsvImportDialog } from './CsvImportDialog'
import { buildLowStockPdf, buildLowStockWhatsAppLink } from './lowStockExport'
import type { Database } from '../../lib/database/types'

type Product = Database['public']['Tables']['products']['Row']

const UNIT_LABELS: Record<string, string> = { piece: 'pza', kg: 'kg', g: 'g', lt: 'lt', m: 'm' }

export function ProductsPage() {
  const { data: member } = useCurrentMember()
  const storeId = member?.store_id
  const canManage =
    member?.role === 'owner' ||
    member?.role === 'manager' ||
    !!(member?.permissions as Record<string, boolean>)?.manage_inventory

  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null)
  const [csvOpen, setCsvOpen] = useState(false)

  const productsQuery = useQuery({
    queryKey: ['products', storeId],
    queryFn: () => listProducts(storeId!),
    enabled: !!storeId,
  })

  const lowStockQuery = useQuery({
    queryKey: ['low-stock', storeId],
    queryFn: () => listLowStockProducts(storeId!),
    enabled: !!storeId,
  })

  if (!storeId) return null

  const filtered = (productsQuery.data ?? []).filter((p) => {
    if (showLowStockOnly && p.stock > p.min_stock) return false
    if (!query) return true
    return p.name.toLowerCase().includes(query.toLowerCase()) || p.barcode?.includes(query)
  })

  async function exportLowStockPdf() {
    if (!lowStockQuery.data || !member?.stores) return
    const blob = await buildLowStockPdf(lowStockQuery.data, member.stores.name)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lista-de-compras.pdf'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  function shareLowStockWhatsApp() {
    if (!lowStockQuery.data || !member?.stores) return
    window.open(
      buildLowStockWhatsAppLink(lowStockQuery.data, member.stores.name),
      '_blank',
      'noopener',
    )
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-carbon-900 dark:text-paper text-2xl font-bold">Inventario</h1>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setCsvOpen(true)}>
              Importar CSV
            </Button>
            <Button
              onClick={() => {
                setEditingProduct(null)
                setFormOpen(true)
              }}
            >
              + Producto
            </Button>
          </div>
        )}
      </div>

      {lowStockQuery.data && lowStockQuery.data.length > 0 && (
        <div className="rounded-xl bg-amber-50 p-4 dark:bg-amber-900/20">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              ⚠️ {lowStockQuery.data.length} producto(s) con stock bajo
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={exportLowStockPdf}
                className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-300"
              >
                PDF
              </button>
              <button
                type="button"
                onClick={shareLowStockWhatsApp}
                className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-300"
              >
                WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="search"
          placeholder="Buscar por nombre o código..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 min-h-11 flex-1 rounded-xl border bg-white px-4 text-base"
        />
        <button
          type="button"
          onClick={() => setShowLowStockOnly((v) => !v)}
          className={`min-h-11 rounded-xl px-3 text-sm font-medium ${
            showLowStockOnly
              ? 'bg-amber-500 text-white'
              : 'bg-carbon-100 text-carbon-700 dark:bg-carbon-800 dark:text-carbon-200'
          }`}
        >
          Stock bajo
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {filtered.map((product) => (
          <li
            key={product.id}
            className="border-carbon-200 dark:border-carbon-800 dark:bg-carbon-900 flex items-center justify-between gap-3 rounded-xl border bg-white p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-carbon-900 dark:text-paper truncate font-medium">
                {product.name} {product.is_favorite && '⭐'}
              </p>
              <p className="text-carbon-500 dark:text-carbon-400 text-sm">
                {product.categories?.name ?? 'Sin categoría'} · ${product.price.toFixed(2)} · costo
                ${product.cost.toFixed(2)}
              </p>
              <p
                className={`text-sm ${product.stock <= product.min_stock ? 'font-medium text-amber-600 dark:text-amber-400' : 'text-carbon-400'}`}
              >
                Stock: {product.stock} {UNIT_LABELS[product.unit_type]}
              </p>
            </div>
            {canManage && (
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(product)
                    setFormOpen(true)
                  }}
                  className="text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/20 min-h-11 rounded-lg px-3 text-sm font-medium"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(product)}
                  className="text-carbon-500 hover:bg-carbon-100 dark:text-carbon-400 dark:hover:bg-carbon-800 min-h-11 rounded-lg px-3 text-sm font-medium"
                >
                  Ajustar stock
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <ProductFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          queryClient.invalidateQueries({ queryKey: ['low-stock', storeId] })
        }}
        storeId={storeId}
        product={editingProduct}
      />
      <StockAdjustDialog
        product={adjustingProduct}
        storeId={storeId}
        onClose={() => {
          setAdjustingProduct(null)
          queryClient.invalidateQueries({ queryKey: ['low-stock', storeId] })
        }}
      />
      <CsvImportDialog open={csvOpen} onClose={() => setCsvOpen(false)} storeId={storeId} />
    </div>
  )
}
