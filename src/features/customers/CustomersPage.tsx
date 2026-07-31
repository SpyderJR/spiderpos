import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useCurrentMember } from '../auth/useCurrentMember'
import { Button } from '../../components/ui/Button'
import { listCustomers } from './api'
import { CustomerFormDialog } from './CustomerFormDialog'
import { CustomerStatementModal } from './CustomerStatementModal'
import type { Database } from '../../lib/database/types'

type Customer = Database['public']['Tables']['customers']['Row']

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

      <ul className="flex flex-col gap-2">
        {filtered.map((customer) => (
          <li
            key={customer.id}
            className="border-carbon-200 dark:border-carbon-800 dark:bg-carbon-900 flex items-center justify-between gap-3 rounded-xl border bg-white p-4"
          >
            <button
              type="button"
              onClick={() => setStatementCustomer(customer)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="text-carbon-900 dark:text-paper truncate font-medium">
                {customer.name}
              </p>
              <p className="text-carbon-500 dark:text-carbon-400 text-sm">
                {customer.phone ?? 'Sin teléfono'}
              </p>
            </button>
            <div className="text-right">
              <p
                className={`font-bold ${
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
          </li>
        ))}
        {filtered.length === 0 && (
          <p className="text-carbon-400 text-center text-sm">
            Todavía no tienes clientes registrados.
          </p>
        )}
      </ul>

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
