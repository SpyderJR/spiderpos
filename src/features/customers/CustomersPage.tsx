import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useCurrentMember } from '../auth/useCurrentMember'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { SkeletonList } from '../../components/ui/Skeleton'
import { listCustomers } from './api'
import { CustomerFormDialog } from './CustomerFormDialog'
import { CustomerStatementModal } from './CustomerStatementModal'
import type { Database } from '../../lib/database/types'

type Customer = Database['public']['Tables']['customers']['Row']

function creditRatio(customer: Customer) {
  if (customer.credit_limit <= 0) return 0
  return Math.min(customer.credit_balance / customer.credit_limit, 1)
}

function creditColor(ratio: number) {
  if (ratio >= 0.9) return 'bg-red-500'
  if (ratio >= 0.6) return 'bg-amber-500'
  return 'bg-emerald-500'
}

export function CustomersPage() {
  const { data: member } = useCurrentMember()
  const storeId = member?.store_id
  const storeName = member?.stores?.name ?? 'SpiderPOS'

  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null)

  const customersQuery = useQuery({
    queryKey: ['customers', storeId],
    queryFn: () => listCustomers(storeId!),
    enabled: !!storeId,
  })

  if (!storeId) return null

  const filtered = (customersQuery.data ?? []).filter(
    (c) => !query || c.name.toLowerCase().includes(query.toLowerCase()) || c.phone?.includes(query),
  )

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-carbon-900 dark:text-paper text-2xl font-bold">Clientes y fiados</h1>
        <Button
          onClick={() => {
            setEditingCustomer(null)
            setFormOpen(true)
          }}
        >
          + Cliente
        </Button>
      </div>

      <input
        type="search"
        placeholder="Buscar por nombre o teléfono..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 min-h-11 rounded-xl border bg-white px-4 text-base"
      />

      {customersQuery.isLoading ? (
        <SkeletonList />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🧑‍🤝‍🧑"
          title="Sin clientes todavía"
          description="Agrega tu primer cliente para empezar a llevar sus fiados."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((customer) => {
            const ratio = creditRatio(customer)
            return (
              <Card key={customer.id} className="flex items-center gap-3 p-4">
                <button
                  type="button"
                  onClick={() => setStatementCustomer(customer)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="to-brand-600 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 text-base font-bold text-white">
                    {customer.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-carbon-900 dark:text-paper truncate font-medium">
                      {customer.name}
                    </p>
                    <p className="text-carbon-500 dark:text-carbon-400 text-sm">
                      {customer.phone ?? 'Sin teléfono'}
                    </p>
                    {customer.credit_limit > 0 && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="bg-carbon-100 dark:bg-carbon-800 h-1.5 w-24 overflow-hidden rounded-full">
                          <div
                            className={`h-full rounded-full ${creditColor(ratio)}`}
                            style={{
                              width: `${Math.max(ratio * 100, customer.credit_balance > 0 ? 4 : 0)}%`,
                            }}
                          />
                        </div>
                        <span className="text-carbon-400 text-xs tabular-nums">
                          ${customer.credit_balance.toFixed(0)} / $
                          {customer.credit_limit.toFixed(0)}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
                <div className="text-right">
                  <p
                    className={`font-bold tabular-nums ${
                      customer.credit_balance > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-carbon-400'
                    }`}
                  >
                    ${customer.credit_balance.toFixed(2)}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCustomer(customer)
                      setFormOpen(true)
                    }}
                    className="text-brand-600 dark:text-brand-400 text-sm hover:underline"
                  >
                    Editar
                  </button>
                </div>
              </Card>
            )
          })}
        </ul>
      )}

      <CustomerFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        storeId={storeId}
        customer={editingCustomer}
      />
      <CustomerStatementModal
        customer={statementCustomer}
        storeId={storeId}
        storeName={storeName}
        onClose={() => setStatementCustomer(null)}
      />
    </div>
  )
}
