import { supabase } from '../../lib/supabase'
import type { CartLine } from '../../store/useCartStore'
import type { Json } from '../../lib/database/types'

export interface PaymentInput {
  method: 'cash' | 'card' | 'transfer' | 'credit'
  amount: number
  change_given?: number
}

export interface CheckoutInput {
  saleId: string
  items: CartLine[]
  payments: PaymentInput[]
  customerId: string | null
  discount: number
  notes?: string
  clientCreatedAt: string
}

export async function checkoutSale(input: CheckoutInput) {
  const items: Json = input.items.map((item) => ({
    product_id: item.productId,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    discount: item.discount,
  }))
  const payments: Json = input.payments.map((p) => ({ ...p }))

  const { data, error } = await supabase.rpc('record_sale', {
    p_sale_id: input.saleId,
    p_items: items,
    p_payments: payments,
    p_client_created_at: input.clientCreatedAt,
    p_customer_id: input.customerId ?? undefined,
    p_discount: input.discount,
    p_notes: input.notes,
  })
  if (error) throw error
  return data as { id: string; total: number; already_existed: boolean }
}

export async function verifySupervisorPin(pin: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('verify_supervisor_pin', { p_pin: pin })
  if (error) throw error
  return data ?? false
}
