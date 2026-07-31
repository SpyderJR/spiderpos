import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database/types'

type Promotion = Database['public']['Tables']['promotions']['Row']
type PromotionInsert = Database['public']['Tables']['promotions']['Insert']

export async function listPromotions(
  storeId: string,
): Promise<
  (Promotion & { products: { name: string } | null; categories: { name: string } | null })[]
> {
  const { data, error } = await supabase
    .from('promotions')
    .select('*, products(name), categories(name)')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createPromotion(promotion: PromotionInsert): Promise<Promotion> {
  const { data, error } = await supabase.from('promotions').insert(promotion).select().single()
  if (error) throw error
  return data
}

export async function togglePromotion(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('promotions').update({ active }).eq('id', id)
  if (error) throw error
}

export async function deletePromotion(id: string): Promise<void> {
  const { error } = await supabase.from('promotions').delete().eq('id', id)
  if (error) throw error
}
