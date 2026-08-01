import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCurrentMember } from '../auth/useCurrentMember'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { SkeletonList } from '../../components/ui/Skeleton'
import { listProducts, listLowStockProducts } from './api'
import { ProductFormDialog } from './ProductFormDialog'
import { StockAdjustDialog } from './StockAdjustDialog'
import { CsvImportDialog } from './CsvImportDialog'
import { buildLowStockPdf, buildLowStockWhatsAppLink } from './lowStockExport'
import type { Database } from '../../lib/database/types'

type Product = Database['public']['Tables']['products']['Row']

const UNIT_LABELS: Record<string, string> = { piece: 'pza', kg: 'kg', g: 'g', lt: 'lt', m: 'm' }

function stockTone(product: Product): { color: string; ratio: number } {
  const ratio =
    product.min_stock > 0 ? product.stock / product.min_stock : product.stock > 0 ? 2 : 0
  if (ratio <= 1) return { color: 'bg-red-500', ratio: Math.max(ratio, 0.06) }
  if (ratio <= 1.5) return { color: 'bg-amber-500', ratio: Math.min(ratio / 2, 1) }
  return { color: 'bg-emerald-500', ratio: 1 }
}

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
  const [view, setView] = useState<'grid' | 'list'>('grid')
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

  function openEdit(product: Product) {
    setEditingProduct(product)
    setFormOpen(true)
  }

  return (
    <div className="relative mx-auto flex max-w-5xl flex-col gap-4 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-carbon-900 dark:text-paper text-2xl font-bold">Inventario</h1>
        {canManage && (
          <div className="hidden gap-2 sm:flex">
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
        <Card className="border-amber-200! bg-amber-50 p-4 dark:border-amber-900/40! dark:bg-amber-900/20">
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
        </Card>
      )}

      <div className="flex gap-2">
        <input
          type="search"
          placeholder="Buscar por nombre o código..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 min-h-11 flex-1 rounded-xl border bg-white px-4 text-base"
        />
        <div className="bg-carbon-100 dark:bg-carbon-800 flex items-center gap-0.5 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setView('grid')}
            aria-label="Vista de cuadrícula"
            className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm ${view === 'grid' ? 'dark:bg-carbon-900 bg-white shadow-sm' : ''}`}
          >
            ▦
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            aria-label="Vista de lista"
            className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm ${view === 'list' ? 'dark:bg-carbon-900 bg-white shadow-sm' : ''}`}
          >
            ☰
          </button>
        </div>
      </div>

      {/* Filtros como chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setShowLowStockOnly((v) => !v)}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
            showLowStockOnly
              ? 'bg-amber-500 text-white'
              : 'bg-carbon-100 text-carbon-600 dark:bg-carbon-800 dark:text-carbon-300'
          }`}
        >
          ⚠️ Stock bajo
        </button>
      </div>

      {productsQuery.isLoading ? (
        <SkeletonList />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📦"
          title="Sin productos"
          description={
            query ? `No hay resultados para "${query}".` : 'Agrega tu primer producto para empezar.'
          }
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => {
            const tone = stockTone(product)
            return (
              <Card
                key={product.id}
                className="flex cursor-pointer flex-col overflow-hidden p-0 transition-shadow hover:shadow-[var(--shadow-elevated)]"
                onClick={() => canManage && openEdit(product)}
              >
                {product.image_url ? (
                  <img src={product.image_url} alt="" className="h-24 w-full object-cover" />
                ) : (
                  <div className="to-brand-600 flex h-24 w-full items-center justify-center bg-gradient-to-br from-violet-500 text-2xl font-bold text-white/90">
                    {product.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-1.5 p-3">
                  <p className="text-carbon-900 dark:text-paper line-clamp-2 text-sm font-medium">
                    {product.name} {product.is_favorite && '⭐'}
                  </p>
                  <p className="text-brand-600 dark:text-brand-400 text-sm font-bold tabular-nums">
                    ${product.price.toFixed(2)}
                  </p>
                  <div>
                    <div className="bg-carbon-100 dark:bg-carbon-800 h-1.5 w-full overflow-hidden rounded-full">
                      <div
                        className={`h-full rounded-full ${tone.color}`}
                        style={{ width: `${tone.ratio * 100}%` }}
                      />
                    </div>
                    <p className="text-carbon-400 mt-1 text-xs tabular-nums">
                      {product.stock} {UNIT_LABELS[product.unit_type]}
                    </p>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setAdjustingProduct(product)
                      }}
                      className="text-carbon-500 hover:bg-carbon-100 dark:text-carbon-400 dark:hover:bg-carbon-800 mt-1 min-h-9 rounded-lg text-xs font-medium"
                    >
                      Ajustar stock
                    </button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((product) => {
            const tone = stockTone(product)
            return (
              <Card key={product.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-carbon-900 dark:text-paper truncate font-medium">
                    {product.name} {product.is_favorite && '⭐'}
                  </p>
                  <p className="text-carbon-500 dark:text-carbon-400 text-sm tabular-nums">
                    {product.categories?.name ?? 'Sin categoría'} · ${product.price.toFixed(2)} ·
                    costo ${product.cost.toFixed(2)}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="bg-carbon-100 dark:bg-carbon-800 h-1.5 w-24 overflow-hidden rounded-full">
                      <div
                        className={`h-full rounded-full ${tone.color}`}
                        style={{ width: `${tone.ratio * 100}%` }}
                      />
                    </div>
                    <span className="text-carbon-400 text-xs tabular-nums">
                      {product.stock} {UNIT_LABELS[product.unit_type]}
                    </span>
                  </div>
                </div>
                {canManage && (
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(product)}
                      className="text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/20 min-h-9 rounded-lg px-3 text-sm font-medium"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustingProduct(product)}
                      className="text-carbon-500 hover:bg-carbon-100 dark:text-carbon-400 dark:hover:bg-carbon-800 min-h-9 rounded-lg px-3 text-sm font-medium"
                    >
                      Ajustar
                    </button>
                  </div>
                )}
              </Card>
            )
          })}
        </ul>
      )}

      {canManage && (
        <button
          type="button"
          onClick={() => {
            setEditingProduct(null)
            setFormOpen(true)
          }}
          aria-label="Agregar producto"
          className="to-brand-600 fixed right-4 bottom-24 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 text-2xl text-white shadow-[var(--shadow-floating)] sm:hidden"
        >
          +
        </button>
      )}

      <ProductFormDialog
        key={formOpen ? (editingProduct?.id ?? 'new') : 'closed'}
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
