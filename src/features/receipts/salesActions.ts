import { supabase } from '../../lib/supabase'

export interface SaleItemDetail {
  id: string
  productName: string
  quantity: number
  unitPrice: number
  alreadyReturned: number
  remaining: number
}

export async function fetchSaleItemsForReturn(saleId: string): Promise<SaleItemDetail[]> {
  const { data, error } = await supabase
    .from('sale_items')
    .select('id, quantity, unit_price, products(name), return_items(quantity)')
    .eq('sale_id', saleId)
  if (error) throw error
  return data.map((item) => {
    const alreadyReturned = item.return_items.reduce((sum, ri) => sum + ri.quantity, 0)
    return {
      id: item.id,
      productName: item.products?.name ?? 'Producto',
      quantity: item.quantity,
      unitPrice: item.unit_price,
      alreadyReturned,
      remaining: item.quantity - alreadyReturned,
    }
  })
}

export async function returnSaleItems(
  saleId: string,
  items: { sale_item_id: string; quantity: number }[],
  reason: string,
) {
  const { data, error } = await supabase.rpc('return_sale_items', {
    p_sale_id: saleId,
    p_items: items,
    p_reason: reason,
  })
  if (error) throw error
  return data as { return_id: string; total_returned: number }
}

export async function cancelSale(saleId: string, reason: string, supervisorPin: string) {
  const { error } = await supabase.rpc('cancel_sale', {
    p_sale_id: saleId,
    p_reason: reason,
    p_supervisor_pin: supervisorPin,
  })
  if (error) throw error
}
