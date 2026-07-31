import { supabase } from '../../lib/supabase'

export interface ReportFilters {
  storeId: string
  from: string
  to: string
}

interface RawSale {
  id: string
  total: number
  client_created_at: string
  employee_id: string
  store_members: { full_name: string } | null
  sale_payments: { method: string; amount: number }[]
  sale_items: {
    quantity: number
    unit_price: number
    unit_cost: number
    subtotal: number
    products: { name: string } | null
  }[]
}

export interface ReportData {
  totalSales: number
  saleCount: number
  averageTicket: number
  grossMargin: number
  byPaymentMethod: { method: string; amount: number }[]
  topProducts: { name: string; total: number }[]
  byHour: { hour: number; total: number }[]
  byEmployee: { name: string; total: number }[]
  rawSales: RawSale[]
}

export async function fetchReportData({ storeId, from, to }: ReportFilters): Promise<ReportData> {
  const { data, error } = await supabase
    .from('sales')
    .select(
      `id, total, client_created_at, employee_id,
       store_members!employee_id(full_name),
       sale_payments(method, amount),
       sale_items(quantity, unit_price, unit_cost, subtotal, products(name))`,
    )
    .eq('store_id', storeId)
    .eq('status', 'completed')
    .gte('client_created_at', from)
    .lte('client_created_at', to)
    .order('client_created_at', { ascending: true })

  if (error) throw error
  const sales = data as RawSale[]

  const totalSales = sales.reduce((sum, s) => sum + s.total, 0)
  const saleCount = sales.length
  const averageTicket = saleCount > 0 ? totalSales / saleCount : 0

  const grossMargin = sales.reduce(
    (sum, s) =>
      sum +
      s.sale_items.reduce(
        (isum, item) => isum + (item.unit_price - item.unit_cost) * item.quantity,
        0,
      ),
    0,
  )

  const paymentTotals = new Map<string, number>()
  for (const sale of sales) {
    for (const payment of sale.sale_payments) {
      paymentTotals.set(payment.method, (paymentTotals.get(payment.method) ?? 0) + payment.amount)
    }
  }

  const productTotals = new Map<string, number>()
  for (const sale of sales) {
    for (const item of sale.sale_items) {
      const name = item.products?.name ?? 'Producto'
      productTotals.set(name, (productTotals.get(name) ?? 0) + item.subtotal)
    }
  }

  const hourTotals = new Array(24).fill(0) as number[]
  for (const sale of sales) {
    const hour = new Date(sale.client_created_at).getHours()
    hourTotals[hour] = (hourTotals[hour] ?? 0) + sale.total
  }

  const employeeTotals = new Map<string, number>()
  for (const sale of sales) {
    const name = sale.store_members?.full_name ?? 'N/D'
    employeeTotals.set(name, (employeeTotals.get(name) ?? 0) + sale.total)
  }

  return {
    totalSales,
    saleCount,
    averageTicket,
    grossMargin,
    byPaymentMethod: [...paymentTotals.entries()].map(([method, amount]) => ({ method, amount })),
    topProducts: [...productTotals.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8),
    byHour: hourTotals.map((total, hour) => ({ hour, total })),
    byEmployee: [...employeeTotals.entries()].map(([name, total]) => ({ name, total })),
    rawSales: sales,
  }
}
