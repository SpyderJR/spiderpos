import { supabase } from '../../lib/supabase'
import { getSavedPrinterConfig } from '../receipts/thermalPrinter'

export async function markTourCompleted(memberId: string) {
  const { error } = await supabase
    .from('store_members')
    .update({ tour_completed_at: new Date().toISOString() })
    .eq('id', memberId)
  if (error) throw error
}

export async function clearTourCompleted(memberId: string) {
  const { error } = await supabase
    .from('store_members')
    .update({ tour_completed_at: null })
    .eq('id', memberId)
  if (error) throw error
}

export interface ChecklistStatus {
  hasLogo: boolean
  hasTaxData: boolean
  hasProduct: boolean
  hasStaffWithPin: boolean
  hasPrinter: boolean
  hasPayout: boolean
  hasSale: boolean
}

async function existsQuery(
  table: 'products' | 'sales',
  storeId: string,
  extraFilter?: (q: ReturnType<typeof supabase.from>) => ReturnType<typeof supabase.from>,
): Promise<boolean> {
  let query = supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId)
  if (extraFilter) query = extraFilter(query) as typeof query
  const { count, error } = await query
  if (error) throw error
  return (count ?? 0) > 0
}

/**
 * Cada punto se calcula a partir de datos reales (no una bandera aparte
 * que se pueda desincronizar): si el dueño sube el logo desde Perfil, o
 * un cajero hace la primera venta, el checklist se refleja solo en el
 * siguiente refetch — nunca hay que "marcarlo" a mano.
 */
export async function fetchChecklistStatus(
  storeId: string,
  storeLogoUrl: string | null,
  storeTaxData: Record<string, unknown> | null,
  storePayoutClabe: string | null,
): Promise<ChecklistStatus> {
  const [hasProduct, hasSale, staffResult] = await Promise.all([
    existsQuery('products', storeId),
    existsQuery('sales', storeId, (q) => q.eq('status', 'completed')),
    supabase
      .from('store_members')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .neq('role', 'owner')
      .not('pin_hash', 'is', null),
  ])
  if (staffResult.error) throw staffResult.error

  return {
    hasLogo: !!storeLogoUrl,
    hasTaxData: !!storeTaxData && Object.keys(storeTaxData).length > 0,
    hasProduct,
    hasStaffWithPin: (staffResult.count ?? 0) > 0,
    hasPrinter: !!getSavedPrinterConfig(),
    hasPayout: !!storePayoutClabe,
    hasSale,
  }
}
