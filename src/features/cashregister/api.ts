import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database/types'

type CashShift = Database['public']['Tables']['cash_shifts']['Row']
type CashMovement = Database['public']['Tables']['cash_movements']['Row']

export async function fetchOpenShift(
  storeId: string,
  employeeId: string,
): Promise<CashShift | null> {
  const { data, error } = await supabase
    .from('cash_shifts')
    .select('*')
    .eq('store_id', storeId)
    .eq('employee_id', employeeId)
    .eq('status', 'open')
    .maybeSingle()
  if (error) throw error
  return data
}

export async function listShiftHistory(
  storeId: string,
): Promise<(CashShift & { store_members: { full_name: string } | null })[]> {
  const { data, error } = await supabase
    .from('cash_shifts')
    .select('*, store_members!employee_id(full_name)')
    .eq('store_id', storeId)
    .eq('status', 'closed')
    .order('closing_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return data
}

export async function openShift(openingAmount: number): Promise<string> {
  const { data, error } = await supabase.rpc('open_cash_shift', { p_opening_amount: openingAmount })
  if (error) throw error
  return data
}

export async function closeShift(shiftId: string, countedAmount: number) {
  const { data, error } = await supabase.rpc('close_cash_shift', {
    p_cash_shift_id: shiftId,
    p_counted_amount: countedAmount,
  })
  if (error) throw error
  return data as { theoretical: number; counted: number; difference: number }
}

export async function listMovements(shiftId: string): Promise<CashMovement[]> {
  const { data, error } = await supabase
    .from('cash_movements')
    .select('*')
    .eq('cash_shift_id', shiftId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addMovement(
  storeId: string,
  shiftId: string,
  type: 'in' | 'out',
  amount: number,
  reason: string,
) {
  const { error } = await supabase.from('cash_movements').insert({
    store_id: storeId,
    cash_shift_id: shiftId,
    type,
    amount,
    reason,
  })
  if (error) throw error
}
