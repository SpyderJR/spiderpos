import { useState } from 'react'
import { ProductsPage } from './ProductsPage'
import { SuppliersPage } from './SuppliersPage'
import { PurchaseOrdersPage } from './PurchaseOrdersPage'

const TABS = [
  { key: 'products', label: 'Productos' },
  { key: 'suppliers', label: 'Proveedores' },
  { key: 'purchases', label: 'Compras' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function InventoryPage() {
  const [tab, setTab] = useState<TabKey>('products')

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-carbon-100 dark:bg-carbon-800 mx-auto flex w-full max-w-4xl gap-1 rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`min-h-11 flex-1 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? 'text-brand-600 dark:bg-carbon-900 dark:text-brand-400 bg-white shadow-sm'
                : 'text-carbon-500 dark:text-carbon-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'products' && <ProductsPage />}
      {tab === 'suppliers' && <SuppliersPage />}
      {tab === 'purchases' && <PurchaseOrdersPage />}
    </div>
  )
}
