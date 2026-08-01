import { Modal } from './ui/Modal'

interface OfflineExplainerModalProps {
  open: boolean
  onClose: () => void
}

const STEPS = [
  {
    icon: '📶',
    title: 'Tu catálogo vive en tu celular',
    desc: 'Cada vez que tienes señal, SpiderPOS guarda una copia de tus productos, clientes y promociones directo en tu dispositivo — no depende de internet para mostrarlos.',
  },
  {
    icon: '🔌',
    title: 'Se va la luz o el internet — sigues vendiendo',
    desc: 'Puedes seguir cobrando en efectivo y fiado exactamente igual. Cada venta se guarda en tu celular con un folio único, como si nada hubiera pasado.',
  },
  {
    icon: '🔄',
    title: 'Se sincroniza sola en cuanto regresa la señal',
    desc: 'Sin que hagas nada: apenas tu dispositivo detecta conexión, todas las ventas pendientes se mandan al servidor en orden. Nunca se pierde una venta ni se duplica.',
  },
  {
    icon: '👀',
    title: 'Siempre ves cuánto falta por sincronizar',
    desc: 'Un indicador arriba de la pantalla te dice "Sin conexión — 3 ventas por sincronizar" para que sepas exactamente qué está pendiente.',
  },
]

export function OfflineExplainerModal({ open, onClose }: OfflineExplainerModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Así funciona sin internet">
      <div className="flex flex-col gap-4">
        {STEPS.map((step) => (
          <div key={step.title} className="flex gap-3">
            <span className="text-2xl" aria-hidden="true">
              {step.icon}
            </span>
            <div>
              <p className="text-carbon-900 dark:text-paper text-sm font-semibold">{step.title}</p>
              <p className="text-carbon-500 dark:text-carbon-400 text-sm">{step.desc}</p>
            </div>
          </div>
        ))}
        <p className="border-carbon-100 dark:border-carbon-800 text-carbon-400 border-t pt-3 text-xs">
          Nota: pagos con tarjeta y recargas sí necesitan conexión, porque involucran a un banco en
          tiempo real. Efectivo y fiado funcionan 100% sin internet.
        </p>
      </div>
    </Modal>
  )
}
