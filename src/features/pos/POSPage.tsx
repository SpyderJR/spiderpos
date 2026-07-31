import { Suspense, lazy, useCallback, useState } from 'react'
import { useCurrentMember } from '../auth/useCurrentMember'
import { useProductSync } from './useProductSync'
import { useProductSearch } from './useProductSearch'
import { useHidScanner } from './useHidScanner'
import { useCartStore, useCartTotal } from '../../store/useCartStore'
import { db } from '../../lib/db'
import type { LocalProduct } from '../../lib/db'
import { BulkQuantityModal } from './BulkQuantityModal'
import { CartPanel } from './CartPanel'
import { PaymentModal } from './PaymentModal'
import { ParkedSalesDrawer } from './ParkedSalesDrawer'
import { Modal } from '../../components/ui/Modal'
import { checkoutSale, type PaymentInput } from './api'
import { playScanBeep, playChaChing, playErrorTone, vibrate } from './sensoryFeedback'
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

export function POSPage() {
  const { data: member } = useCurrentMember()
  const storeId = member?.store_id
  const { resync } = useProductSync(storeId)
  const { favorites, search, findByBarcode } = useProductSearch(storeId)

  const items = useCartStore((state) => state.items)
  const discount = useCartStore((state) => state.discount)
  const customerId = useCartStore((state) => state.customerId)
  const addProduct = useCartStore((state) => state.addProduct)
  const clearCart = useCartStore((state) => state.clear)
  const total = useCartTotal()

  const [query, setQuery] = useState('')
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

  const canDiscountWithoutPin =
    member?.role === 'owner' ||
    member?.role === 'manager' ||
    !!(member?.permissions as Record<string, boolean>)?.manual_discount

  function handleProductPick(product: LocalProduct) {
    if (product.unitType === 'piece') {
      addProduct(product, 1)
      playScanBeep()
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

  const results = query ? search(query) : []

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
    setCheckingOut(true)
    setCheckoutError(null)
    try {
      const saleId = crypto.randomUUID()
      await checkoutSale({
        saleId,
        items,
        payments,
        customerId,
        discount,
        clientCreatedAt: new Date().toISOString(),
      })
      playChaChing()
      vibrate([40, 60, 40])
      clearCart()
      setPaymentOpen(false)
      setCartOpenMobile(false)
      resync()
      fetchReceiptData(saleId)
        .then((data) => setCompletedReceipt(data))
        .catch(() => {
          /* la venta ya quedó registrada; solo falló mostrar el ticket */
        })
    } catch (err) {
      playErrorTone()
      setCheckoutError(err instanceof Error ? err.message : 'No se pudo registrar la venta')
    } finally {
      setCheckingOut(false)
    }
  }

  if (!storeId) return null

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] flex-col gap-4 md:h-[calc(100dvh-5rem)] md:flex-row">
      <div className="flex flex-1 flex-col gap-3 overflow-hidden">
        <div className="flex gap-2">
          <input
            type="search"
            inputMode="search"
            placeholder="Buscar producto o escanear código..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-carbon-200 text-carbon-900 focus:border-brand-500 focus:ring-brand-500/30 dark:border-carbon-700 dark:bg-carbon-900 dark:text-paper min-h-11 flex-1 rounded-xl border bg-white px-4 text-base outline-none focus:ring-2"
          />
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            aria-label="Escanear con cámara"
            className="bg-brand-600 flex min-h-11 min-w-11 items-center justify-center rounded-xl text-xl text-white hover:brightness-110"
          >
            📷
          </button>
          <button
            type="button"
            onClick={() => setParkedOpen(true)}
            aria-label="Tickets en espera"
            className="bg-carbon-100 text-carbon-700 dark:bg-carbon-800 dark:text-carbon-200 flex min-h-11 min-w-11 items-center justify-center rounded-xl text-xl"
          >
            🅿️
          </button>
          <button
            type="button"
            onClick={() => setPrinterSettingsOpen(true)}
            aria-label="Configurar impresora"
            className="bg-carbon-100 text-carbon-700 dark:bg-carbon-800 dark:text-carbon-200 flex min-h-11 min-w-11 items-center justify-center rounded-xl text-xl"
          >
            🖨️
          </button>
        </div>

        <div className="border-carbon-200 dark:border-carbon-800 dark:bg-carbon-900 flex-1 overflow-y-auto rounded-2xl border bg-white p-3">
          {query ? (
            results.length === 0 ? (
              <p className="text-carbon-400 p-6 text-center text-sm">
                Sin resultados para "{query}"
              </p>
            ) : (
              <ProductGrid products={results} onPick={handleProductPick} />
            )
          ) : (
            <>
              <p className="text-carbon-500 dark:text-carbon-400 mb-2 px-1 text-sm font-medium">
                Favoritos
              </p>
              {favorites.length === 0 ? (
                <p className="text-carbon-400 p-6 text-center text-sm">
                  Marca productos como favoritos en Inventario para verlos aquí.
                </p>
              ) : (
                <ProductGrid products={favorites} onPick={handleProductPick} />
              )}
            </>
          )}
        </div>
      </div>

      <div className="border-carbon-200 dark:border-carbon-800 dark:bg-carbon-900 hidden w-96 shrink-0 rounded-2xl border bg-white md:block">
        <CartPanel
          canDiscountWithoutPin={canDiscountWithoutPin}
          onCheckout={() => setPaymentOpen(true)}
          onPark={parkCurrentCart}
        />
      </div>

      <button
        type="button"
        onClick={() => setCartOpenMobile(true)}
        className="from-brand-600 to-indigo-accent fixed inset-x-4 bottom-20 z-10 flex min-h-11 items-center justify-between rounded-xl bg-gradient-to-br px-4 py-3 text-white shadow-lg md:hidden"
      >
        <span>{items.length} artículo(s)</span>
        <span className="font-bold">${total.toFixed(2)}</span>
      </button>

      <Modal open={cartOpenMobile} onClose={() => setCartOpenMobile(false)} title="Carrito">
        <div className="h-[70dvh]">
          <CartPanel
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
          playScanBeep()
          vibrate(30)
        }}
      />
      <PaymentModal
        open={paymentOpen}
        total={total}
        hasCustomer={!!customerId}
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
            <p className="text-carbon-900 dark:text-paper text-center text-2xl font-bold">
              ${completedReceipt.total.toFixed(2)}
            </p>
            <ReceiptActions data={completedReceipt} />
          </div>
        )}
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
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <button
          key={product.id}
          type="button"
          onClick={() => onPick(product)}
          className="border-carbon-200 hover:border-brand-400 hover:bg-brand-50 dark:border-carbon-700 dark:bg-carbon-800 dark:hover:bg-carbon-700 flex min-h-20 flex-col items-start justify-between rounded-xl border bg-white p-3 text-left transition-colors"
        >
          <span className="text-carbon-900 dark:text-paper line-clamp-2 text-sm font-medium">
            {product.name}
          </span>
          <span className="text-brand-600 dark:text-brand-400 text-sm font-bold">
            ${product.price.toFixed(2)}
            {product.unitType !== 'piece' && (
              <span className="text-carbon-400 text-xs font-normal">
                {' '}
                /{UNIT_LABELS[product.unitType]}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  )
}
