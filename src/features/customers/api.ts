import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database/types'

type Customer = Database['public']['Tables']['customers']['Row']
type CustomerInsert = Database['public']['Tables']['customers']['Insert']
type CustomerUpdate = Database['public']['Tables']['customers']['Update']

export async function listCustomers(storeId: string): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('store_id', storeId)
    .order('name')
  if (error) throw error
  return data
}

export async function createCustomer(customer: CustomerInsert): Promise<Customer> {
  const { data, error } = await supabase.from('customers').insert(customer).select().single()
  if (error) throw error
  return data
}

export async function updateCustomer(id: string, values: CustomerUpdate): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .update(values)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export interface StatementEntry {
  id: string
  type: 'sale' | 'payment'
  date: string
  description: string
  amount: number
}

export async function fetchCustomerStatement(customerId: string): Promise<StatementEntry[]> {
  const [salesRes, paymentsRes] = await Promise.all([
    supabase
      .from('sales')
      .select('id, total, client_created_at, sale_payments(method, amount)')
      .eq('customer_id', customerId)
      .order('client_created_at', { ascending: false }),
    supabase
      .from('customer_payments')
      .select('id, amount, created_at, method')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
  ])

  if (salesRes.error) throw salesRes.error
  if (paymentsRes.error) throw paymentsRes.error

  const saleEntries: StatementEntry[] = salesRes.data
    .map((sale) => {
      const creditAmount = sale.sale_payments
        .filter((p) => p.method === 'credit')
        .reduce((sum, p) => sum + p.amount, 0)
      return { sale, creditAmount }
    })
    .filter(({ creditAmount }) => creditAmount > 0)
    .map(({ sale, creditAmount }) => ({
      id: sale.id,
      type: 'sale' as const,
      date: sale.client_created_at,
      description: `Venta a crédito #${sale.id.slice(0, 8).toUpperCase()}`,
      amount: creditAmount,
    }))

  const paymentEntries: StatementEntry[] = paymentsRes.data.map((payment) => ({
    id: payment.id,
    type: 'payment' as const,
    date: payment.created_at,
    description: 'Abono',
    amount: -payment.amount,
  }))

  return [...saleEntries, ...paymentEntries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
}

export async function recordCustomerPayment(
  customerId: string,
  amount: number,
  method: string,
  note?: string,
) {
  const { data, error } = await supabase.rpc('record_customer_payment', {
    p_customer_id: customerId,
    p_amount: amount,
    p_method: method,
    p_note: note,
  })
  if (error) throw error
  return data as { new_balance: number }
}
