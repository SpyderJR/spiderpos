import { supabase } from '../../lib/supabase'
import type { ReceiptData } from './types'

export interface SaleListItem {
  id: string
  total: number
  status: string
  clientCreatedAt: string
  cashierName: string
  paymentMethods: string[]
}

export async function listSales(storeId: string, limit = 50): Promise<SaleListItem[]> {
  const { data, error } = await supabase
    .from('sales')
    .select(
      'id, total, status, client_created_at, store_members!employee_id(full_name), sale_payments(method)',
    )
    .eq('store_id', storeId)
    .order('client_created_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  return data.map((sale) => ({
    id: sale.id,
    total: sale.total,
    status: sale.status,
    clientCreatedAt: sale.client_created_at,
    cashierName: sale.store_members?.full_name ?? 'N/D',
    paymentMethods: [...new Set(sale.sale_payments.map((p) => p.method))],
  }))
}

export async function fetchReceiptData(saleId: string): Promise<ReceiptData> {
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .select(
      `id, total, subtotal, discount, client_created_at,
       store_members!employee_id(full_name),
       customers(name),
       stores(name, address, phone, logo_url, footer_message),
       sale_items(quantity, unit_price, discount, subtotal, products(name, unit_type)),
       sale_payments(method, amount, change_given)`,
    )
    .eq('id', saleId)
    .single()

  if (saleError) throw saleError

  return {
    saleId: sale.id,
    folio: sale.id.slice(0, 8).toUpperCase(),
    createdAt: sale.client_created_at,
    cashierName: sale.store_members?.full_name ?? 'N/D',
    customerName: sale.customers?.name ?? null,
    storeName: sale.stores?.name ?? 'SpiderPOS',
    storeAddress: sale.stores?.address ?? null,
    storePhone: sale.stores?.phone ?? null,
    storeLogoUrl: sale.stores?.logo_url ?? null,
    footerMessage: sale.stores?.footer_message ?? null,
    items: sale.sale_items.map((item) => ({
      name: item.products?.name ?? 'Producto',
      quantity: item.quantity,
      unitType: item.products?.unit_type ?? 'piece',
      unitPrice: item.unit_price,
      discount: item.discount,
      subtotal: item.subtotal,
    })),
    subtotal: sale.subtotal,
    discount: sale.discount,
    total: sale.total,
    payments: sale.sale_payments.map((p) => ({
      method: p.method,
      amount: p.amount,
      changeGiven: p.change_given,
    })),
    isCopy: false,
  }
}
