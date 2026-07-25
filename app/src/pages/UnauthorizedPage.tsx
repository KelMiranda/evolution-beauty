import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldAlert } from 'lucide-react'

export function UnauthorizedPage() {
  return (
    <div className="min-h-[100dvh] bg-charcoal text-ivory flex items-center justify-center px-6 py-16">
      <div className="max-w-2xl w-full text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-gold" />
        <h1 className="mt-6 font-display text-5xl leading-tight">Acceso no autorizado</h1>
        <p className="mt-5 text-warm-gray text-lg">
          Tu cuenta no tiene permiso para abrir esta sección.
        </p>
        <Link
          to="/dashboard/config"
          className="mt-10 inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3 text-sm font-semibold text-charcoal hover:bg-gold-light transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al panel
        </Link>
      </div>
    </div>
  )
}
