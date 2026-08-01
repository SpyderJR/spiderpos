import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCurrentMember } from '../auth/useCurrentMember'
import { useProductSync } from './useProductSync'
import { useProductSearch } from './useProductSearch'
import { useHidScanner } from './useHidScanner'
import { useCartStore } from '../../store/useCartStore'
import { useCartPricing } from './useCartPricing'
import { db } from '../../lib/db'
import type { LocalProduct } from '../../lib/db'
import { BulkQuantityModal } from './BulkQuantityModal'
import { CartPanel } from './CartPanel'
import { PaymentModal } from './PaymentModal'
import { ParkedSalesDrawer } from './ParkedSalesDrawer'
import { Modal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/ui/EmptyState'
import { SkeletonList } from '../../components/ui/Skeleton'
import { checkoutSale, type PaymentInput } from './api'
import { queueSale, isNetworkError } from './offlineQueue'
import { useOnlineStatus } from '../../lib/useOnlineStatus'
import { playScanBeep, playChaChing, playErrorTone, playPop, vibrate } from '../../lib/sound'
import { fetchReceiptData } from '../receipts/api'
import { ReceiptActions } from '../receipts/ReceiptActions'
import { PrinterSettingsModal } from '../receipts/PrinterSettingsModal'
import type { ReceiptData } from '../receipts/types'

// La librería de escaneo (ZXing, con fallback para navegadores sin
// BarcodeDetector nativo) pesa bastante — se carga solo al abrir la cámara.
const BarcodeScanner = lazy(() =>
  import('./BarcodeScanner').then((m) => ({ default: m.BarcodeScanner })),
)

const UNIT_LABELS: Record<string, string> = { piece: 'pza', kg: 'kg', g: 'g', lt: 'lt', m: 'm' }

const TILE_GRADIENTS = [
  'from-violet-500 to-brand-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-sky-500 to-blue-600',
  'from-pink-500 to-rose-600',
  'from-teal-500 to-cyan-600',
]

function tileGradient(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return TILE_GRADIENTS[hash % TILE_GRADIENTS.length]
}

export function POSPage() {
  const { data: member } = useCurrentMember()
  const storeId = member?.store_id
  const queryClient = useQueryClient()
  const { resync, syncing } = useProductSync(storeId)
  const isOnline = useOnlineStatus()
  const { products, favorites, search, findByBarcode } = useProductSearch(storeId)

  const items = useCartStore((state) => state.items)
  const customerId = useCartStore((state) => state.customerId)
  const addProduct = useCartStore((state) => state.addProduct)
  const clearCart = useCartStore((state) => state.clear)
  const { pricedItems, manualDiscount, total } = useCartPricing(storeId)

  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [bulkProduct, setBulkProduct] = useState<LocalProduct | null>(null)
  const [cartOpenMobile, setCartOpenMobile] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [parkedOpen, setParkedOpen] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null)
  const [completedReceipt, setCompletedReceipt] = useState<ReceiptData | null>(null)
  const [printerSettingsOpen, setPrinterSettingsOpen] = useState(false)
  const [queuedNotice, setQueuedNotice] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const canDiscountWithoutPin =
    member?.role === 'owner' ||
    member?.role === 'manager' ||
    !!(member?.permissions as Record<string, boolean>)?.manual_discount

  const categories = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of products) {
      if (p.categoryId && p.categoryName) map.set(p.categoryId, p.categoryName)
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )
  }, [products])

  function handleProductPick(product: LocalProduct) {
    if (product.unitType === 'piece') {
      addProduct(product, 1)
      playPop()
      vibrate(30)
    } else {
      setBulkProduct(product)
    }
  }

  const handleBarcode = useCallback(
    (code: string) => {
      const product = findByBarcode(code)
      if (product) {
        handleProductPick(product)
        playScanBeep()
        setScannerOpen(false)
        setQuery('')
      } else {
        playErrorTone()
        vibrate(200)
        setNotFoundCode(code)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [findByBarcode],
  )

  useHidScanner(handleBarcode, !scannerOpen)

  // Atajos de teclado para cajeros en PC/terminal táctil con teclado
  // físico (PRD 5.B): F2 busca, F3 escanea, F4 cobra, F6 pone en espera,
  // Esc limpia la búsqueda / cierra modales secundarios.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'F2') {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === 'F3') {
        e.preventDefault()
        setScannerOpen(true)
      } else if (e.key === 'F4') {
        e.preventDefault()
        if (items.length > 0) setPaymentOpen(true)
      } else if (e.key === 'F6') {
        e.preventDefault()
        setParkedOpen(true)
      } else if (e.key === 'Escape' && query) {
        setQuery('')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [items.length, query])

  const results = query ? search(query) : []
  const categoryProducts = activeCategory
    ? products.filter((p) => p.categoryId === activeCategory)
    : []

  async function parkCurrentCart() {
    if (!storeId || items.length === 0) return
    await db.parkedSales.add({
      id: crypto.randomUUID(),
      storeId,
      label: `Ticket ${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`,
      customerId,
      items: items.map((item) => ({
        productId: item.productId,
        name: item.name,
        unitPrice: item.unitPrice,
        unitCost: item.unitCost,
        quantity: item.quantity,
        discount: item.discount,
        unitType: item.unitType,
      })),
      createdAt: Date.now(),
    })
    clearCart()
    setCartOpenMobile(false)
  }

  async function confirmPayment(payments: PaymentInput[]) {
    if (!isOnline && payments.some((p) => p.method === 'card')) {
      setCheckoutError('Los pagos con tarjeta requieren conexión a internet.')
      return
    }

    setCheckingOut(true)
    setCheckoutError(null)
    const saleId = crypto.randomUUID()
    const checkoutInput = {
      saleId,
      items: pricedItems.map((item) => ({ ...item, discount: item.computedDiscount })),
      payments,
      customerId,
      discount: manualDiscount,
      clientCreatedAt: new Date().toISOString(),
    }

    try {
      if (!isOnline) throw new Error('offline')
      await checkoutSale(checkoutInput)
      playChaChing()
      vibrate([40, 60, 40])
      clearCart()
      setPaymentOpen(false)
      setCartOpenMobile(false)
      resync()
      queryClient.invalidateQueries({ queryKey: ['customers', storeId] })
      fetchReceiptData(saleId)
        .then((data) => setCompletedReceipt(data))
        .catch(() => {
          /* la venta ya quedó registrada; solo falló mostrar el ticket */
        })
    } catch (err) {
      if (isNetworkError(err) && storeId) {
        await queueSale(checkoutInput, storeId)
        playChaChing()
        vibrate([40, 60, 40])
        clearCart()
        setPaymentOpen(false)
        setCartOpenMobile(false)
        setQueuedNotice(true)
      } else {
        playErrorTone()
        setCheckoutError(err instanceof Error ? err.message : 'No se pudo registrar la venta')
      }
    } finally {
      setCheckingOut(false)
    }
  }

  if (!storeId) return null

  const showingCategory = !query && activeCategory
  const gridProducts = query ? results : showingCategory ? categoryProducts : favorites
  const gridLabel = query
    ? `Resultados para "${query}"`
    : showingCategory
      ? (categories.find((c) => c.id === activeCategory)?.name ?? 'Categoría')
      : 'Favoritos'

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] gap-3 md:h-[calc(100dvh-5rem)]">
      {/* Zona 1: categorías (rail vertical en desktop, oculto en móvil) */}
      {categories.length > 0 && (
        <div className="border-carbon-200 dark:border-carbon-800 dark:bg-carbon-900 hidden w-40 shrink-0 flex-col gap-1 overflow-y-auto rounded-2xl border bg-white p-2 xl:flex">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
              !activeCategory
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                : 'text-carbon-600 hover:bg-carbon-100 dark:text-carbon-300 dark:hover:bg-carbon-800'
            }`}
          >
            ⭐ Favoritos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`truncate rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                  : 'text-carbon-600 hover:bg-carbon-100 dark:text-carbon-300 dark:hover:bg-carbon-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Zona 2: búsqueda + catálogo */}
      <div data-tour="pos-catalog" className="flex min-w-0 flex-1 flex-col gap-3 overflow-hidden">
        <div className="flex gap-2">
          <input
            ref={searchRef}
            data-tour="pos-search"
            type="search"
            inputMode="search"
            placeholder="Buscar producto o escanear código... (F2)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-carbon-200 text-carbon-900 focus:border-brand-500 focus:ring-brand-500/30 dark:border-carbon-700 dark:bg-carbon-900 dark:text-paper min-h-11 flex-1 rounded-xl border bg-white px-4 text-base outline-none focus:ring-2"
          />
          <button
            type="button"
            data-tour="pos-scan"
            onClick={() => setScannerOpen(true)}
            aria-label="Escanear con cámara (F3)"
            title="Escanear con cámara (F3)"
            className="to-brand-600 flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 text-xl text-white hover:brightness-110 active:scale-[0.97]"
          >
            📷
          </button>
          <button
            type="button"
            onClick={() => setParkedOpen(true)}
            aria-label="Tickets en espera (F6)"
            title="Tickets en espera (F6)"
            className="bg-carbon-100 text-carbon-700 dark:bg-carbon-800 dark:text-carbon-200 flex min-h-11 min-w-11 items-center justify-center rounded-xl text-xl active:scale-[0.97]"
          >
            🅿️
          </button>
          <button
            type="button"
            onClick={() => setPrinterSettingsOpen(true)}
            aria-label="Configurar impresora"
            className="bg-carbon-100 text-carbon-700 dark:bg-carbon-800 dark:text-carbon-200 flex min-h-11 min-w-11 items-center justify-center rounded-xl text-xl active:scale-[0.97]"
          >
            🖨️
          </button>
        </div>

        {/* Chips de categoría — versión horizontal para tablet/móvil donde el rail está oculto */}
        {categories.length > 0 && !query && (
          <div className="flex gap-2 overflow-x-auto pb-1 xl:hidden">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                !activeCategory
                  ? 'to-brand-600 bg-gradient-to-br from-violet-600 text-white'
                  : 'bg-carbon-100 text-carbon-600 dark:bg-carbon-800 dark:text-carbon-300'
              }`}
            >
              ⭐ Favoritos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat.id
                    ? 'to-brand-600 bg-gradient-to-br from-violet-600 text-white'
                    : 'bg-carbon-100 text-carbon-600 dark:bg-carbon-800 dark:text-carbon-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        <div className="border-carbon-200 dark:border-carbon-800 dark:bg-carbon-900 flex-1 overflow-y-auto rounded-2xl border bg-white p-3">
          {syncing && products.length === 0 ? (
            <SkeletonList count={6} />
          ) : (
            <>
              <p className="text-carbon-500 dark:text-carbon-400 mb-2 px-1 text-sm font-medium">
                {gridLabel}
              </p>
              {gridProducts.length === 0 ? (
                <EmptyState
                  icon={query ? '🔍' : '⭐'}
                  title={query ? 'Sin resultados' : 'Nada por aquí todavía'}
                  description={
                    query
                      ? `No encontramos productos para "${query}".`
                      : 'Marca productos como favoritos en Inventario para verlos aquí, o elige una categoría.'
                  }
                />
              ) : (
                <ProductGrid products={gridProducts} onPick={handleProductPick} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Zona 3: ticket + cobro */}
      <div className="border-carbon-200 dark:border-carbon-800 dark:bg-carbon-900 hidden w-96 shrink-0 rounded-2xl border bg-white shadow-[var(--shadow-elevated)] md:block">
        <CartPanel
          storeId={storeId}
          canDiscountWithoutPin={canDiscountWithoutPin}
          onCheckout={() => setPaymentOpen(true)}
          onPark={parkCurrentCart}
        />
      </div>

      <button
        type="button"
        data-tour="pos-cobrar"
        onClick={() => setCartOpenMobile(true)}
        className="to-brand-600 fixed inset-x-4 bottom-20 z-10 flex min-h-11 items-center justify-between rounded-xl bg-gradient-to-br from-violet-600 px-4 py-3 text-white shadow-[var(--shadow-floating)] md:hidden"
      >
        <span>{items.length} artículo(s)</span>
        <span className="font-bold tabular-nums">${total.toFixed(2)}</span>
      </button>

      <Modal open={cartOpenMobile} onClose={() => setCartOpenMobile(false)} title="Carrito">
        <div className="h-[70dvh]">
          <CartPanel
            storeId={storeId}
            canDiscountWithoutPin={canDiscountWithoutPin}
            onCheckout={() => {
              setCartOpenMobile(false)
              setPaymentOpen(true)
            }}
            onPark={parkCurrentCart}
          />
        </div>
      </Modal>

      {scannerOpen && (
        <Suspense fallback={null}>
          <BarcodeScanner
            open={scannerOpen}
            onClose={() => setScannerOpen(false)}
            onDetect={handleBarcode}
          />
        </Suspense>
      )}
      <BulkQuantityModal
        product={bulkProduct}
        onClose={() => setBulkProduct(null)}
        onConfirm={(quantity) => {
          if (bulkProduct) addProduct(bulkProduct, quantity)
          setBulkProduct(null)
          playPop()
          vibrate(30)
        }}
      />
      <PaymentModal
        open={paymentOpen}
        total={total}
        hasCustomer={!!customerId}
        isOnline={isOnline}
        submitting={checkingOut}
        error={checkoutError}
        onClose={() => setPaymentOpen(false)}
        onConfirm={confirmPayment}
      />
      <ParkedSalesDrawer open={parkedOpen} onClose={() => setParkedOpen(false)} storeId={storeId} />

      {notFoundCode && (
        <Modal
          open={!!notFoundCode}
          onClose={() => setNotFoundCode(null)}
          title="Producto no encontrado"
        >
          <p className="text-carbon-600 dark:text-carbon-300">
            No hay ningún producto con el código <strong>{notFoundCode}</strong> en el catálogo.
          </p>
        </Modal>
      )}

      <Modal
        open={!!completedReceipt}
        onClose={() => setCompletedReceipt(null)}
        title="Venta completada ✅"
      >
        {completedReceipt && (
          <div className="flex flex-col gap-4">
            <p className="text-carbon-900 dark:text-paper text-center text-2xl font-bold tabular-nums">
              ${completedReceipt.total.toFixed(2)}
            </p>
            <ReceiptActions data={completedReceipt} />
          </div>
        )}
      </Modal>

      <Modal open={queuedNotice} onClose={() => setQueuedNotice(false)} title="Venta guardada 📥">
        <div className="flex flex-col gap-3 text-center">
          <p className="text-carbon-700 dark:text-carbon-300">
            No hay conexión — la venta se guardó en este dispositivo y se sincronizará
            automáticamente en cuanto vuelva el internet.
          </p>
          <button
            type="button"
            onClick={() => setQueuedNotice(false)}
            className="text-brand-600 dark:text-brand-400 text-sm font-medium hover:underline"
          >
            Entendido
          </button>
        </div>
      </Modal>

      <PrinterSettingsModal
        open={printerSettingsOpen}
        onClose={() => setPrinterSettingsOpen(false)}
      />
    </div>
  )
}

function ProductGrid({
  products,
  onPick,
}: {
  products: LocalProduct[]
  onPick: (product: LocalProduct) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product) => (
        <button
          key={product.id}
          type="button"
          onClick={() => onPick(product)}
          className="group border-carbon-200 hover:border-brand-400 dark:border-carbon-700 dark:bg-carbon-800 flex flex-col overflow-hidden rounded-xl border bg-white text-left transition-all hover:shadow-[var(--shadow-elevated)] active:scale-[0.98]"
        >
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt=""
              className="h-20 w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className={`flex h-20 w-full items-center justify-center bg-gradient-to-br text-2xl font-bold text-white/90 ${tileGradient(product.categoryId ?? product.id)}`}
              aria-hidden="true"
            >
              {product.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-1 flex-col justify-between gap-1 p-2.5">
            <span className="text-carbon-900 dark:text-paper line-clamp-2 text-sm font-medium">
              {product.name}
            </span>
            <span className="text-brand-600 dark:text-brand-400 text-sm font-bold tabular-nums">
              ${product.price.toFixed(2)}
              {product.unitType !== 'piece' && (
                <span className="text-carbon-400 text-xs font-normal">
                  {' '}
                  /{UNIT_LABELS[product.unitType]}
                </span>
              )}
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}
