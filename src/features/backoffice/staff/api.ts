import { z } from 'zod'
import { supabase } from '../../../lib/supabase'
import { env } from '../../../lib/env'
import type { Database } from '../../../lib/database/types'
import type { PermissionKey } from '../permissions'

type StoreMember = Database['public']['Tables']['store_members']['Row']

export async function listStaff(storeId: string): Promise<StoreMember[]> {
  const { data, error } = await supabase
    .from('store_members')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

const createStaffResponseSchema = z.object({
  member: z.object({
    id: z.uuid(),
    full_name: z.string(),
    role: z.enum(['manager', 'cashier']),
    active: z.boolean(),
  }),
})

export interface CreateStaffInput {
  full_name: string
  email?: string
  role: 'manager' | 'cashier'
  pin: string
  permissions: Record<PermissionKey, boolean>
}

export async function createStaffMember(input: CreateStaffInput) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('No autenticado')

  const response = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/create-staff-member`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(input),
  })

  const body: unknown = await response.json()
  if (!response.ok) {
    const message =
      typeof body === 'object' && body && 'error' in body
        ? String(body.error)
        : 'Error al crear empleado'
    throw new Error(message)
  }

  return createStaffResponseSchema.parse(body).member
}

export async function updateStaffMember(
  id: string,
  values: Partial<Pick<StoreMember, 'full_name' | 'role' | 'active' | 'permissions'>>,
) {
  const { data, error } = await supabase
    .from('store_members')
    .update(values)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function resetStaffPin(id: string, pin: string) {
  const { data: pinHash, error: hashError } = await supabase.rpc('hash_pin', { p_pin: pin })
  if (hashError) throw hashError
  const { error } = await supabase.from('store_members').update({ pin_hash: pinHash }).eq('id', id)
  if (error) throw error
}

export async function deleteStaffMember(id: string) {
  const { error } = await supabase.from('store_members').delete().eq('id', id)
  if (error) throw error
}
