import { supabase } from '../../lib/supabase'

export interface AuditLogEntry {
  id: string
  action: string
  entityType: string
  entityId: string | null
  metadata: Record<string, unknown>
  createdAt: string
  employeeName: string
}

export async function listAuditLog(storeId: string, limit = 100): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('id, action, entity_type, entity_id, metadata, created_at, store_members(full_name)')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data.map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at,
    employeeName: row.store_members?.full_name ?? 'Sistema',
  }))
}
