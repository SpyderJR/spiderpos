import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCurrentMember } from '../../auth/useCurrentMember'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Badge } from '../../../components/ui/Badge'
import { SkeletonList } from '../../../components/ui/Skeleton'
import { listStaff, updateStaffMember, deleteStaffMember } from './api'
import { PERMISSION_KEYS, PERMISSION_LABELS } from '../permissions'
import { CreateStaffDialog } from './CreateStaffDialog'
import { ResetPinDialog } from './ResetPinDialog'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Dueño',
  manager: 'Gerente',
  cashier: 'Cajero',
}

export function StaffPage() {
  const { data: currentMember } = useCurrentMember()
  const storeId = currentMember?.store_id
  const canManage = currentMember?.role === 'owner' || currentMember?.role === 'manager'
  const isOwner = currentMember?.role === 'owner'
  const isDemo = currentMember?.stores?.is_demo

  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [pinTarget, setPinTarget] = useState<{ id: string; name: string } | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const staffQuery = useQuery({
    queryKey: ['staff', storeId],
    queryFn: () => listStaff(storeId!),
    enabled: !!storeId,
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateStaffMember(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff', storeId] }),
  })

  const permissionMutation = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: Record<string, boolean> }) =>
      updateStaffMember(id, { permissions }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff', storeId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteStaffMember(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff', storeId] }),
  })

  if (!storeId) return null

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-carbon-900 dark:text-paper text-2xl font-bold">Personal</h1>
        {canManage && !isDemo && <Button onClick={() => setCreateOpen(true)}>+ Empleado</Button>}
      </div>
      {isDemo && (
        <p className="text-carbon-400 text-sm">
          Alta de personal no disponible en modo demo — regístrate para tu propia tienda.
        </p>
      )}

      {staffQuery.isLoading && <SkeletonList />}

      <ul className="flex flex-col gap-3">
        {staffQuery.data?.map((member) => {
          const permissions = (member.permissions as Record<string, boolean>) ?? {}
          const isExpanded = expandedId === member.id
          return (
            <Card key={member.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="to-brand-600 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 text-sm font-bold text-white">
                    {member.full_name.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-carbon-900 dark:text-paper font-medium">
                      {member.full_name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="text-carbon-500 dark:text-carbon-400 text-sm">
                        {ROLE_LABELS[member.role]}
                      </span>
                      <Badge tone={member.active ? 'success' : 'neutral'} dot>
                        {member.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  </div>
                </div>
                {canManage && member.role !== 'owner' && (
                  <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setPinTarget({ id: member.id, name: member.full_name })}
                      className="text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/20 min-h-11 rounded-xl px-3 text-sm font-medium"
                    >
                      PIN
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : member.id)}
                      className="text-carbon-500 hover:bg-carbon-100 dark:text-carbon-400 dark:hover:bg-carbon-800 min-h-11 rounded-xl px-3 text-sm font-medium"
                    >
                      {isExpanded ? 'Ocultar' : 'Permisos'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        toggleActiveMutation.mutate({ id: member.id, active: !member.active })
                      }
                      className="text-carbon-500 hover:bg-carbon-100 dark:text-carbon-400 dark:hover:bg-carbon-800 min-h-11 rounded-xl px-3 text-sm font-medium"
                    >
                      {member.active ? 'Desactivar' : 'Activar'}
                    </button>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`¿Eliminar a ${member.full_name}?`))
                            deleteMutation.mutate(member.id)
                        }}
                        className="min-h-11 rounded-xl px-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isExpanded && member.role === 'cashier' && (
                <div className="border-carbon-100 dark:border-carbon-800 mt-4 flex flex-col gap-2 border-t pt-4">
                  {PERMISSION_KEYS.map((key) => (
                    <label
                      key={key}
                      className="text-carbon-700 dark:text-carbon-300 flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!permissions[key]}
                        onChange={(e) =>
                          permissionMutation.mutate({
                            id: member.id,
                            permissions: { ...permissions, [key]: e.target.checked },
                          })
                        }
                      />
                      {PERMISSION_LABELS[key]}
                    </label>
                  ))}
                </div>
              )}
              {isExpanded && member.role === 'manager' && (
                <p className="border-carbon-100 text-carbon-500 dark:border-carbon-800 dark:text-carbon-400 mt-4 border-t pt-4 text-sm">
                  Los gerentes tienen acceso completo por defecto.
                </p>
              )}
            </Card>
          )
        })}
      </ul>

      <CreateStaffDialog open={createOpen} onClose={() => setCreateOpen(false)} storeId={storeId} />
      {pinTarget && (
        <ResetPinDialog
          open={!!pinTarget}
          onClose={() => setPinTarget(null)}
          storeId={storeId}
          memberId={pinTarget.id}
          memberName={pinTarget.name}
        />
      )}
    </div>
  )
}
