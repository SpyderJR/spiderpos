import { Link } from 'react-router-dom'

export function DemoBanner() {
  return (
    <div className="text-carbon-900 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-sm font-medium">
      <span>🎬 Modo demo — los datos se reinician todos los días.</span>
      <Link to="/registro" className="underline hover:no-underline">
        Regístrate para tu propia tienda
      </Link>
    </div>
  )
}
