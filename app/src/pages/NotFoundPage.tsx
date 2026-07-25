import { Link } from 'react-router-dom'
import { ArrowLeft, Home, GraduationCap, Search } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="min-h-[100dvh] bg-charcoal text-ivory flex items-center justify-center px-6 py-16">
      <div className="max-w-3xl w-full text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/5 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-gold/80">
          <Search className="h-3.5 w-3.5" />
          Página no encontrada
        </div>

        <h1 className="mt-8 font-display text-5xl md:text-6xl leading-tight">
          No encontramos esta página
        </h1>

        <p className="mt-5 text-warm-gray text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
          La dirección que intentaste abrir no existe o fue movida. Volvé al inicio o explorá las capacitaciones disponibles de ACOES.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3 text-sm font-semibold text-charcoal hover:bg-gold-light transition-colors"
          >
            <Home className="h-4 w-4" />
            Ir al inicio
          </Link>
          <Link
            to="/cursos"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-warm-tan/20 px-6 py-3 text-sm font-semibold text-ivory hover:border-gold/40 hover:text-gold transition-colors"
          >
            <GraduationCap className="h-4 w-4" />
            Ver capacitaciones
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-warm-tan/20 px-6 py-3 text-sm font-semibold text-ivory hover:border-gold/40 hover:text-gold transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
        </div>
      </div>
    </div>
  )
}
