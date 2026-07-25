import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCursos } from '@/services/api'
import { getFacilitatorsCached, resolveFacilitatorName } from '@/lib/facilitators'
import { AnimatedText, FadeIn, PageTransition } from '@/components/animations'
import { Search, MapPin, Users, Calendar, ChevronRight, Clock } from 'lucide-react'
import type { Curso } from '@/types'
import { FALLBACK_COURSE_IMAGE } from '@/lib/images'

const categorias = ['Todos', 'Colorimetría', 'Corte', 'Manicure', 'Maquillaje', 'Tratamientos', 'Barbería']
const niveles = ['Todos', 'Básico', 'Intermedio', 'Avanzado']

export function CatalogoCursosPage() {
  const [cursos, setCursos] = useState<Curso[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState('Todos')
  const [nivel, setNivel] = useState('Todos')
  const [facilitators, setFacilitators] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => { window.scrollTo(0, 0); loadCursos() }, [categoria, nivel])
  useEffect(() => { getFacilitatorsCached().then(setFacilitators).catch(() => setFacilitators([])) }, [])

  const loadCursos = async () => {
    setLoading(true)
    try {
      const data = await getCursos({ search: search || undefined, categoria: categoria === 'Todos' ? undefined : categoria, nivel: nivel === 'Todos' ? undefined : nivel })
      setCursos(data)
    } catch {
      setCursos([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => loadCursos()

  return (
    <PageTransition>
      <div className="min-h-screen bg-charcoal">
        {/* Hero */}
        <section className="relative pt-32 pb-16 px-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-gold/[0.03] to-transparent" />
          <div className="absolute top-20 right-[10%] w-64 h-64 rounded-full bg-gold/[0.025] blur-[80px]" />
          <div className="max-w-7xl mx-auto relative z-10">
            <FadeIn>
              <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-gold/70">Cursos ACOES</span>
            </FadeIn>
            <AnimatedText className="mt-5 font-display text-5xl md:text-6xl text-ivory leading-[0.95]" tag="h1" type="words" stagger={0.06}>
              Formación de excelencia
            </AnimatedText>
            <FadeIn delay={0.3}>
              <p className="mt-5 text-warm-gray max-w-lg leading-relaxed">
                Programas especializados diseñados para elevar tu carrera profesional en cosmetología y estilismo.
              </p>
            </FadeIn>

            <FadeIn delay={0.4} className="mt-10">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-gray/50" />
                  <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="Buscar cursos..."
                    className="w-full pl-11 pr-4 py-3.5 bg-charcoal-light border border-warm-tan/15 rounded-xl text-sm text-ivory placeholder:text-warm-gray/40 focus:outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/10 transition-all" />
                </div>
                <button onClick={handleSearch} className="px-7 py-3.5 bg-gold text-charcoal text-sm font-semibold rounded-xl hover:bg-gold-light transition-all hover:shadow-glow">
                  Buscar
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {categorias.map(cat => (
                  <button key={cat} onClick={() => setCategoria(cat)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-300 ${categoria === cat ? 'bg-gold text-charcoal shadow-glow' : 'bg-charcoal-lighter text-warm-gray border border-warm-tan/15 hover:border-gold/25 hover:text-ivory'}`}>
                    {cat}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {niveles.map(n => (
                  <button key={n} onClick={() => setNivel(n)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${nivel === n ? 'bg-ivory/10 text-ivory border border-ivory/15' : 'text-warm-gray/60 hover:text-ivory/80'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Courses Grid */}
        <section className="pb-24 px-6">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-charcoal-light rounded-2xl overflow-hidden border border-warm-tan/10">
                    <div className="h-48 bg-warm-tan/5 animate-pulse" />
                    <div className="p-6 space-y-3">
                      <div className="h-4 bg-warm-tan/10 rounded w-3/4 animate-pulse" />
                      <div className="h-3 bg-warm-tan/10 rounded w-full animate-pulse" />
                      <div className="h-3 bg-warm-tan/10 rounded w-2/3 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : cursos.length === 0 ? (
              <div className="text-center py-20 text-warm-gray">
                <p className="font-display text-xl">No se encontraron cursos</p>
                <p className="text-sm mt-2">Intenta con otros filtros</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cursos.map((curso, i) => (
                  <FadeIn key={curso.id} delay={i * 0.1} direction="up" distance={40}>
                    <CursoCard curso={curso} facilitators={facilitators} />
                  </FadeIn>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </PageTransition>
  )
}

function CursoCard({ curso, facilitators }: { curso: Curso; facilitators: Array<{ id: string; name: string }> }) {
  const facilitadorNombre = resolveFacilitatorName(curso.facilitadorId, facilitators)
  const cuposRestantes = curso.cupoMaximo - curso.inscritos
  const porcentaje = (curso.inscritos / curso.cupoMaximo) * 100

  return (
    <Link to={`/cursos/${curso.id}`}
      className="group block bg-charcoal-light rounded-2xl overflow-hidden border border-warm-tan/[0.08] hover:border-gold/25 transition-all duration-500 hover:-translate-y-2 hover:shadow-glow">
      <div className="relative h-48 overflow-hidden">
        <img
          src={curso.imagen || FALLBACK_COURSE_IMAGE}
          alt={curso.nombre}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          onError={(e) => { e.currentTarget.src = FALLBACK_COURSE_IMAGE }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-light via-charcoal/30 to-transparent" />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="px-2.5 py-1 bg-charcoal/80 backdrop-blur-md text-ivory text-[10px] font-mono tracking-wider uppercase rounded-md border border-warm-tan/15">{curso.categoria}</span>
          {curso.precio === 0 && <span className="px-2.5 py-1 bg-success/80 backdrop-blur-md text-ivory text-[10px] font-mono tracking-wider uppercase rounded-md">Gratuito</span>}
        </div>
        {curso.estado === 'lleno' && (
          <div className="absolute inset-0 bg-charcoal/60 flex items-center justify-center backdrop-blur-[2px]">
            <span className="px-4 py-2 bg-error/15 text-error text-sm font-medium rounded-lg border border-error/20">Cupo lleno</span>
          </div>
        )}
        {curso.estado === 'proximamente' && (
          <div className="absolute inset-0 bg-charcoal/60 flex items-center justify-center backdrop-blur-[2px]">
            <span className="px-4 py-2 bg-gold/15 text-gold text-sm font-medium rounded-lg border border-gold/20">Próximamente</span>
          </div>
        )}
      </div>
      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg text-ivory group-hover:text-gold transition-colors duration-300 leading-tight">{curso.nombre}</h3>
          {curso.precio > 0 ? (
            <div className="text-right flex-shrink-0">
              {curso.precioOriginal && <span className="block text-[11px] text-warm-gray line-through">${curso.precioOriginal}</span>}
              <span className="text-lg font-display text-gold">${curso.precio}</span>
            </div>
          ) : <span className="text-lg font-display text-success flex-shrink-0">Gratis</span>}
        </div>
        <p className="mt-2 text-sm text-warm-gray line-clamp-2 leading-relaxed">{curso.descripcion}</p>
        {facilitadorNombre && (
          <p className="mt-2 text-[11px] text-gold/80">Facilitador: {facilitadorNombre}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-warm-gray/70">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(curso.fechaInicio).toLocaleDateString('es-SV', { month: 'short', day: 'numeric' })}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{curso.horario}</span>
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{curso.municipio}, {curso.departamento}</span>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-warm-gray/60 flex items-center gap-1"><Users className="w-3 h-3" />{curso.inscritos} de {curso.cupoMaximo}</span>
            <span className={`font-medium ${cuposRestantes <= 3 ? 'text-error' : 'text-gold'}`}>{cuposRestantes} cupos</span>
          </div>
          <div className="h-1.5 bg-warm-tan/10 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${porcentaje >= 90 ? 'bg-error' : porcentaje >= 70 ? 'bg-gold' : 'bg-success'}`} style={{ width: `${porcentaje}%` }} />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[11px] text-warm-gray/50">{curso.nivel}</span>
          <span className="flex items-center gap-1 text-xs text-gold group-hover:gap-2 transition-all duration-300">
            Ver curso <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  )
}
