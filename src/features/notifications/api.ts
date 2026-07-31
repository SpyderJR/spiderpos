import { supabase } from '../../lib/supabase'
import { listLowStockProducts } from '../inventory/api'
import type { Database } from '../../lib/database/types'

export interface AppNotification {
  id: string
  kind: 'low_stock' | 'shift_open' | 'subscription' | 'announcement'
  title: string
  body: string
  href: string | null
  severity: 'warning' | 'critical' | 'info'
}

type Announcement = Database['public']['Tables']['announcements']['Row']

async function checkOpenShiftFromPreviousDay(storeId: string): Promise<AppNotification | null> {
  const { data, error } = await supabase
    .from('cash_shifts')
    .select('id, opening_at')
    .eq('store_id', storeId)
    .eq('status', 'open')
    .order('opening_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null

  const openedAt = new Date(data.opening_at)
  const isPreviousDay = openedAt.toDateString() !== new Date().toDateString()
  if (!isPreviousDay) return null

  return {
    id: `shift-${data.id}`,
    kind: 'shift_open',
    title: 'Corte de caja pendiente',
    body: `Hay un turno abierto desde el ${openedAt.toLocaleDateString('es-MX')} sin cerrar.`,
    href: '/backoffice/caja',
    severity: 'critical',
  }
}

async function checkSubscriptionStatus(storeId: string): Promise<AppNotification | null> {
  const { data } = await supabase
    .from('stores')
    .select('subscription_status')
    .eq('id', storeId)
    .single()
  if (!data) return null

  if (data.subscription_status === 'past_due' || data.subscription_status === 'suspended') {
    return {
      id: `sub-${data.subscription_status}`,
      kind: 'subscription',
      title: 'Pago de suscripción pendiente',
      body: 'Regulariza tu pago para no perder acceso al sistema.',
      href: '/backoffice/suscripcion',
      severity: 'critical',
    }
  }
  return null
}

async function fetchAnnouncements(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)
  if (error) return []
  return data.map((a: Announcement) => ({
    id: `ann-${a.id}`,
    kind: 'announcement' as const,
    title: a.title,
    body: a.body,
    href: null,
    severity: 'info' as const,
  }))
}

export async function fetchNotifications(storeId: string): Promise<AppNotification[]> {
  const [lowStock, shiftAlert, subAlert, announcements] = await Promise.all([
    listLowStockProducts(storeId),
    checkOpenShiftFromPreviousDay(storeId),
    checkSubscriptionStatus(storeId),
    fetchAnnouncements(),
  ])

  const notifications: AppNotification[] = []

  if (lowStock.length > 0) {
    notifications.push({
      id: 'low-stock',
      kind: 'low_stock',
      title: `${lowStock.length} producto(s) con stock bajo`,
      body: lowStock
        .slice(0, 3)
        .map((p) => p.name)
        .join(', '),
      href: '/backoffice/inventario',
      severity: 'warning',
    })
  }
  if (shiftAlert) notifications.push(shiftAlert)
  if (subAlert) notifications.push(subAlert)
  notifications.push(...announcements)

  return notifications
}

export async function createAnnouncement(title: string, body: string) {
  const { error } = await supabase.from('announcements').insert({ title, body })
  if (error) throw error
}
