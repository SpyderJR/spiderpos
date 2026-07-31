import type { Database } from '../../lib/database/types'

export type StoreRole = Database['public']['Enums']['store_role']

export const PERMISSION_KEYS = [
  'manage_inventory',
  'manage_customers',
  'process_returns',
  'view_costs',
  'view_profit_reports',
  'manual_discount',
  'open_drawer_without_sale',
] as const

export type PermissionKey = (typeof PERMISSION_KEYS)[number]

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  manage_inventory: 'Gestionar inventario (productos, compras, proveedores)',
  manage_customers: 'Editar clientes y límites de crédito',
  process_returns: 'Procesar devoluciones',
  view_costs: 'Ver costos de adquisición',
  view_profit_reports: 'Ver reportes de ganancia neta',
  manual_discount: 'Aplicar descuentos manuales sin PIN de supervisor',
  open_drawer_without_sale: 'Abrir el cajón sin una venta',
}

/**
 * Permisos por defecto al crear un empleado. Owner y manager ya tienen
 * acceso total vía auth_role() en las políticas RLS — estos valores solo
 * importan para el rol cashier, que parte restringido.
 */
export function defaultPermissionsForRole(role: StoreRole): Record<PermissionKey, boolean> {
  const allTrue = role === 'manager'
  return PERMISSION_KEYS.reduce(
    (acc, key) => {
      acc[key] = allTrue
      return acc
    },
    {} as Record<PermissionKey, boolean>,
  )
}
