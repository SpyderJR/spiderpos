import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCurrentMember } from '../auth/useCurrentMember'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import {
  fetchOpenShift,
  listShiftHistory,
  openShift,
  closeShift,
  listMovements,
  addMovement,
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
  const [countedAmount, setCountedAmount] = useState('')
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
    mutationFn: () => closeShift(shiftQuery.data!.id, Number.parseFloat(countedAmount)),
    onSuccess: (result) => {
      setCloseResult(result)
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
        <div className="border-carbon-200 dark:border-carbon-800 dark:bg-carbon-900 rounded-2xl border bg-white p-6 text-center">
          <p className="text-carbon-500 dark:text-carbon-400 mb-4">No tienes un turno abierto.</p>
          <Button onClick={() => setOpenDialog(true)}>Abrir turno</Button>
        </div>
      ) : (
        <div className="border-carbon-200 dark:border-carbon-800 dark:bg-carbon-900 rounded-2xl border bg-white p-6">
          <p className="text-carbon-500 dark:text-carbon-400 text-sm">
            Turno abierto desde {new Date(shift.opening_at).toLocaleString('es-MX')}
          </p>
          <p className="text-carbon-900 dark:text-paper text-2xl font-bold">
            Fondo inicial: ${shift.opening_amount.toFixed(2)}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setMovementDialog('in')}>
              + Entrada
            </Button>
            <Button variant="secondary" onClick={() => setMovementDialog('out')}>
              − Salida
            </Button>
          </div>

          {movementsQuery.data && movementsQuery.data.length > 0 && (
            <ul className="border-carbon-100 dark:border-carbon-800 mt-4 flex flex-col gap-1 border-t pt-3 text-sm">
              {movementsQuery.data.map((m) => (
                <li key={m.id} className="flex justify-between">
                  <span className="text-carbon-600 dark:text-carbon-300">
                    {m.type === 'in' ? '➕' : '➖'} {m.reason}
                  </span>
                  <span>${m.amount.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}

          <Button className="mt-4 w-full" onClick={() => setCloseDialog(true)}>
            Cerrar turno (corte de caja)
          </Button>
        </div>
      )}

      {canViewHistory && historyQuery.data && historyQuery.data.length > 0 && (
        <div>
          <h2 className="text-carbon-900 dark:text-paper mb-2 text-lg font-bold">
            Historial de arqueos
          </h2>
          <ul className="flex flex-col gap-2">
            {historyQuery.data.map((s) => (
              <li
                key={s.id}
                className="border-carbon-200 dark:border-carbon-800 dark:bg-carbon-900 flex items-center justify-between rounded-xl border bg-white p-3 text-sm"
              >
                <div>
                  <p className="text-carbon-900 dark:text-paper font-medium">
                    {s.store_members?.full_name} ·{' '}
                    {new Date(s.closing_at!).toLocaleDateString('es-MX')}
                  </p>
                  <p className="text-carbon-500 dark:text-carbon-400">
                    Teórico ${s.closing_amount_theoretical?.toFixed(2)} · Contado $
                    {s.closing_amount_counted?.toFixed(2)}
                  </p>
                </div>
                <span
                  className={`font-bold ${
                    (s.difference ?? 0) === 0
                      ? 'text-carbon-400'
                      : (s.difference ?? 0) > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {(s.difference ?? 0) > 0 ? '+' : ''}${(s.difference ?? 0).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
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
            className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 rounded-xl border px-4 py-3 text-center text-2xl"
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
            className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 rounded-xl border px-4 py-3 text-center text-xl"
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
          setCountedAmount('')
        }}
        title="Corte de caja"
      >
        {!closeResult ? (
          <div className="flex flex-col gap-4">
            <p className="text-carbon-500 dark:text-carbon-400 text-sm">
              Cuenta el efectivo físico en el cajón y captura el total. No verás el monto teórico
              hasta confirmar.
            </p>
            <input
              type="number"
              inputMode="decimal"
              autoFocus
              placeholder="Efectivo contado"
              value={countedAmount}
              onChange={(e) => setCountedAmount(e.target.value)}
              className="border-carbon-200 dark:border-carbon-700 dark:bg-carbon-900 rounded-xl border px-4 py-3 text-center text-2xl"
            />
            <Button
              onClick={() => closeMutation.mutate()}
              disabled={!(Number.parseFloat(countedAmount) >= 0)}
              loading={closeMutation.isPending}
              className="w-full"
            >
              Confirmar conteo y cerrar turno
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 text-center">
            <p className="text-carbon-500 dark:text-carbon-400 text-sm">
              Teórico: ${closeResult.theoretical.toFixed(2)}
            </p>
            <p className="text-carbon-500 dark:text-carbon-400 text-sm">
              Contado: ${closeResult.counted.toFixed(2)}
            </p>
            <p
              className={`text-3xl font-bold ${
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
                setCountedAmount('')
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
