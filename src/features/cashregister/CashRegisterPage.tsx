import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCurrentMember } from '../auth/useCurrentMember'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { BlindCountFlow } from './BlindCountFlow'
import { playConfirm } from '../../lib/sound'
import {
  fetchOpenShift,
  listShiftHistory,
  openShift,
  closeShift,
  listMovements,
  addMovement,
  fetchShiftSalesSummary,
} from './api'

export function CashRegisterPage() {
  const { data: member } = useCurrentMember()
  const storeId = member?.store_id
  const employeeId = member?.id
  const canViewHistory = member?.role === 'owner' || member?.role === 'manager'
  const queryClient = useQueryClient()

  const [openDialog, setOpenDialog] = useState(false)
  const [openingAmount, setOpeningAmount] = useState('')
  const [movementDialog, setMovementDialog] = useState<'in' | 'out' | null>(null)
  const [movementAmount, setMovementAmount] = useState('')
  const [movementReason, setMovementReason] = useState('')
  const [closeDialog, setCloseDialog] = useState(false)
  const [closeResult, setCloseResult] = useState<{
    theoretical: number
    counted: number
    difference: number
  } | null>(null)

  const shiftQuery = useQuery({
    queryKey: ['open-shift', storeId, employeeId],
    queryFn: () => fetchOpenShift(storeId!, employeeId!),
    enabled: !!storeId && !!employeeId,
  })

  const movementsQuery = useQuery({
    queryKey: ['movements', shiftQuery.data?.id],
    queryFn: () => listMovements(shiftQuery.data!.id),
    enabled: !!shiftQuery.data,
  })

  const salesQuery = useQuery({
    queryKey: ['shift-sales', shiftQuery.data?.id],
    queryFn: () => fetchShiftSalesSummary(storeId!, employeeId!, shiftQuery.data!.opening_at),
    enabled: !!shiftQuery.data && !!storeId && !!employeeId,
  })

  const historyQuery = useQuery({
    queryKey: ['shift-history', storeId],
    queryFn: () => listShiftHistory(storeId!),
    enabled: !!storeId && canViewHistory,
  })

  const openMutation = useMutation({
    mutationFn: () => openShift(Number.parseFloat(openingAmount) || 0),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open-shift', storeId, employeeId] })
      setOpeningAmount('')
      setOpenDialog(false)
    },
  })

  const movementMutation = useMutation({
    mutationFn: () =>
      addMovement(
        storeId!,
        shiftQuery.data!.id,
        movementDialog!,
        Number.parseFloat(movementAmount),
        movementReason,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements', shiftQuery.data?.id] })
      setMovementAmount('')
      setMovementReason('')
      setMovementDialog(null)
    },
  })

  const closeMutation = useMutation({
    mutationFn: (countedAmount: number) => closeShift(shiftQuery.data!.id, countedAmount),
    onSuccess: (result) => {
      setCloseResult(result)
      playConfirm()
      queryClient.invalidateQueries({ queryKey: ['open-shift', storeId, employeeId] })
      queryClient.invalidateQueries({ queryKey: ['shift-history', storeId] })
    },
  })

  if (!storeId || !employeeId) return null

  const shift = shiftQuery.data

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-carbon-900 dark:text-paper text-2xl font-bold">Caja</h1>

      {!shift ? (
        <Card className="p-8">
          <EmptyState
            icon="🗄️"
            title="No tienes un turno abierto"
            description="Abre un turno para empezar a vender y registrar movimientos de efectivo."
            action={<Button onClick={() => setOpenDialog(true)}>Abrir turno</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <p className="text-carbon-400 text-xs font-medium">Fondo inicial</p>
              <p className="text-carbon-900 dark:text-paper text-2xl font-bold tabular-nums">
                ${shift.opening_amount.toFixed(2)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-carbon-400 text-xs font-medium">Ventas del turno</p>
              <p className="text-carbon-900 dark:text-paper text-2xl font-bold tabular-nums">
                {salesQuery.data?.count ?? 0}
              </p>
              <p className="text-carbon-500 dark:text-carbon-400 text-xs tabular-nums">
                ${(salesQuery.data?.total ?? 0).toFixed(2)} vendidos
              </p>
            </Card>
          </div>

          <Card className="p-5">
            <div className="mb-1 flex items-center justify-between">
              <Badge tone="success" dot>
                Turno abierto
              </Badge>
              <span className="text-carbon-400 text-xs">
                desde {new Date(shift.opening_at).toLocaleString('es-MX')}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setMovementDialog('in')}>
                🟢 + Entrada
              </Button>
              <Button variant="secondary" onClick={() => setMovementDialog('out')}>
                🔴 − Salida
              </Button>
            </div>

            {movementsQuery.data && movementsQuery.data.length > 0 && (
              <ul className="border-carbon-100 dark:border-carbon-800 mt-4 flex flex-col gap-2 border-t pt-3">
                {movementsQuery.data.map((m) => (
                  <li key={m.id} className="flex items-center justify-between text-sm">
                    <span className="text-carbon-600 dark:text-carbon-300 flex items-center gap-2">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                          m.type === 'in'
                            ? 'bg-emerald-100 dark:bg-emerald-950/40'
                            : 'bg-red-100 dark:bg-red-950/40'
                        }`}
                        aria-hidden="true"
                      >
                        {m.type === 'in' ? '➕' : '➖'}
                      </span>
                      {m.reason}
                    </span>
                    <span className="font-semibold tabular-nums">${m.amount.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}

            <Button className="mt-4 w-full" onClick={() => setCloseDialog(true)}>
              Cerrar turno (corte de caja)
            </Button>
          </Card>
        </>
      )}

      {canViewHistory && (
        <div>
          <h2 className="text-carbon-900 dark:text-paper mb-2 text-lg font-bold">
            Historial de arqueos
          </h2>
          {!historyQuery.data || historyQuery.data.length === 0 ? (
            <EmptyState icon="📋" title="Todavía no hay cortes registrados" />
          ) : (
            <ul className="flex flex-col gap-2">
              {historyQuery.data.map((s) => (
                <Card key={s.id} className="flex items-center justify-between p-3.5">
                  <div>
                    <p className="text-carbon-900 dark:text-paper text-sm font-medium">
                      {s.store_members?.full_name} ·{' '}
                      {new Date(s.closing_at!).toLocaleDateString('es-MX')}
                    </p>
                    <p className="text-carbon-500 dark:text-carbon-400 text-xs tabular-nums">
                      Teórico ${s.closing_amount_theoretical?.toFixed(2)} · Contado $
                      {s.closing_amount_counted?.toFixed(2)}
                    </p>
                  </div>
                  <Badge
                    tone={
                      (s.difference ?? 0) === 0
                        ? 'neutral'
                        : (s.difference ?? 0) > 0
                          ? 'success'
                          : 'critical'
                    }
                  >
                    {(s.difference ?? 0) > 0 ? '+' : ''}${(s.difference ?? 0).toFixed(2)}
                  </Badge>
                </Card>
              ))}
            </ul>
          )}
        </div>
      )}

      <Modal open={openDialog} onClose={() => setOpenDialog(false)} title="Abrir turno">
        <div className="flex flex-col gap-4">
          <input
            type="number"
            inputMode="decimal"
            autoFocus
            placeholder="Fondo de caja inicial"
            value={openingAmount}
            onChange={(e) => setOpeningAmount(e.target.value)}
            className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 rounded-xl border px-4 py-3 text-center text-2xl tabular-nums"
          />
          <Button
            onClick={() => openMutation.mutate()}
            loading={openMutation.isPending}
            className="w-full"
          >
            Abrir turno
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!movementDialog}
        onClose={() => setMovementDialog(null)}
        title={movementDialog === 'in' ? 'Registrar entrada' : 'Registrar salida'}
      >
        <div className="flex flex-col gap-4">
          <input
            type="number"
            inputMode="decimal"
            placeholder="Monto"
            value={movementAmount}
            onChange={(e) => setMovementAmount(e.target.value)}
            className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 rounded-xl border px-4 py-3 text-center text-xl tabular-nums"
          />
          <input
            placeholder="Motivo (obligatorio)"
            value={movementReason}
            onChange={(e) => setMovementReason(e.target.value)}
            className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 rounded-xl border px-4 py-3"
          />
          <Button
            onClick={() => movementMutation.mutate()}
            disabled={!(Number.parseFloat(movementAmount) > 0) || !movementReason.trim()}
            loading={movementMutation.isPending}
            className="w-full"
          >
            Guardar
          </Button>
        </div>
      </Modal>

      <Modal
        open={closeDialog}
        onClose={() => {
          setCloseDialog(false)
          setCloseResult(null)
        }}
        title="Corte de caja"
      >
        {!closeResult ? (
          <BlindCountFlow
            onComplete={(total) => closeMutation.mutate(total)}
            onCancel={() => setCloseDialog(false)}
          />
        ) : (
          <div className="flex flex-col gap-3 text-center">
            <p className="text-carbon-500 dark:text-carbon-400 text-sm">
              Teórico: ${closeResult.theoretical.toFixed(2)}
            </p>
            <p className="text-carbon-500 dark:text-carbon-400 text-sm">
              Contado: ${closeResult.counted.toFixed(2)}
            </p>
            <p
              className={`text-3xl font-bold tabular-nums ${
                closeResult.difference === 0
                  ? 'text-carbon-900 dark:text-paper'
                  : closeResult.difference > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
              }`}
            >
              {closeResult.difference === 0
                ? 'Cuadró exacto ✅'
                : closeResult.difference > 0
                  ? `Sobrante: $${closeResult.difference.toFixed(2)}`
                  : `Faltante: $${Math.abs(closeResult.difference).toFixed(2)}`}
            </p>
            <Button
              onClick={() => {
                setCloseDialog(false)
                setCloseResult(null)
              }}
              className="w-full"
            >
              Listo
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
