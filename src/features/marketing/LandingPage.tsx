import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Logo } from '../../components/Logo'

const FEATURES = [
  {
    title: 'POS ultra rápido',
    desc: 'Escaneo por cámara, pagos mixtos, ticket en espera y búsqueda instantánea. Funciona sin internet.',
  },
  {
    title: 'Inventario y compras',
    desc: 'Stock por pieza o a granel, alertas de faltantes, órdenes de compra y costo promedio ponderado.',
  },
  {
    title: 'Fiados con WhatsApp',
    desc: 'Libreta de crédito digital con cobranza automatizada y enlace de pago en línea.',
  },
  {
    title: 'Cortes de caja ciegos',
    desc: 'Arqueo sin ver el teórico, sobrantes/faltantes automáticos y gráficas en tiempo real.',
  },
  {
    title: 'Promociones inteligentes',
    desc: '2x1, 3x2, precio por mayoreo y descuentos por categoría, aplicados al instante en el cobro.',
  },
  {
    title: 'Auditoría inmutable',
    desc: 'Cancelaciones, devoluciones y ajustes de stock quedan registrados: quién, qué y cuándo.',
  },
]

const PLANS = [
  {
    id: 'monthly' as const,
    name: 'Mensual Estándar',
    price: '$149.99',
    period: '/mes',
    note: 'Acceso completo a todos los módulos',
  },
  {
    id: 'annual' as const,
    name: 'Anual de Lanzamiento',
    price: '$1,499',
    period: '/año',
    note: 'Equivale a 2 meses gratis',
    highlight: true,
  },
]

export function LandingPage() {
  return (
    <div className="bg-paper dark:bg-carbon-950 min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <div className="flex items-center gap-2">
          <Logo className="h-9 w-9" />
          <span className="text-carbon-900 dark:text-paper text-lg font-bold">
            Spider<span className="text-brand-600 dark:text-brand-400">POS</span>
          </span>
        </div>
        <Link
          to="/login"
          className="text-carbon-600 dark:text-carbon-300 hover:text-brand-600 dark:hover:text-brand-400 text-sm font-medium"
        >
          Ya tengo cuenta
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-4">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-6 py-16 text-center"
        >
          <h1 className="text-carbon-900 dark:text-paper max-w-2xl text-4xl font-bold text-balance sm:text-5xl">
            El punto de venta que tu changarro se merece
          </h1>
          <p className="text-carbon-600 dark:text-carbon-300 max-w-xl text-lg text-balance">
            Vende, controla tu inventario, cobra fiados y saca tus cortes de caja — desde tu
            celular, tablet o PC. Sin hardware costoso, funciona hasta sin internet.
          </p>
          <Link
            to="/registro"
            className="bg-brand-600 hover:bg-brand-700 rounded-xl px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-colors"
          >
            Comenzar ahora
          </Link>
          <p className="text-carbon-400 text-xs">Configura tu tienda en menos de 10 minutos</p>
        </motion.section>

        <section className="grid grid-cols-1 gap-4 py-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="dark:bg-carbon-900 border-carbon-100 dark:border-carbon-800 rounded-2xl border bg-white p-6"
            >
              <h3 className="text-carbon-900 dark:text-paper mb-1 font-semibold">{f.title}</h3>
              <p className="text-carbon-500 dark:text-carbon-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </section>

        <section id="planes" className="py-16">
          <h2 className="text-carbon-900 dark:text-paper mb-8 text-center text-2xl font-bold">
            Planes simples, sin sorpresas
          </h2>
          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl border p-6 ${
                  plan.highlight
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 relative'
                    : 'dark:bg-carbon-900 border-carbon-100 dark:border-carbon-800 bg-white'
                }`}
              >
                {plan.highlight && (
                  <span className="bg-brand-600 absolute -top-3 left-6 rounded-full px-3 py-1 text-xs font-semibold text-white">
                    Mejor precio
                  </span>
                )}
                <h3 className="text-carbon-900 dark:text-paper font-semibold">{plan.name}</h3>
                <p className="text-carbon-900 dark:text-paper mt-2 text-3xl font-bold">
                  {plan.price}
                  <span className="text-carbon-400 text-base font-normal">{plan.period}</span>
                </p>
                <p className="text-carbon-500 dark:text-carbon-400 mt-1 text-sm">{plan.note}</p>
                <Link
                  to={`/registro?plan=${plan.id}`}
                  className={`mt-6 block rounded-xl py-2.5 text-center text-sm font-semibold transition-colors ${
                    plan.highlight
                      ? 'bg-brand-600 hover:bg-brand-700 text-white'
                      : 'bg-carbon-100 text-carbon-900 hover:bg-carbon-200 dark:bg-carbon-800 dark:text-paper'
                  }`}
                >
                  Elegir plan
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-carbon-100 dark:border-carbon-800 border-t py-8 text-center">
        <p className="text-carbon-400 text-xs">
          © {new Date().getFullYear()} SpiderPOS. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  )
}
