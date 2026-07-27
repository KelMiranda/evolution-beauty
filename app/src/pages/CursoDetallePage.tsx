import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom'
import { getCurso, inscribir, resolvePublicEnrollmentLink } from '@/services/api'
import { AnimatedSection } from '@/components/AnimatedSection'
import { FALLBACK_COURSE_IMAGE } from '@/lib/images'
import { normalizeDui } from '@/lib/dui'
import {
  loadPending,
  matchesPending,
  savePending,
  clearPending,
} from '@/lib/pendingEnrollment'
import {
  MapPin, Calendar, Clock, Users, ChevronLeft, CheckCircle2,
  User, AlertCircle, Tag
} from 'lucide-react'
import type { Curso } from '@/types'

export function CursoDetallePage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [curso, setCurso] = useState<Curso | null>(null)
  const [facilitadorNombre, setFacilitadorNombre] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({ dui: '' })
  const [formError, setFormError] = useState('')
  const [publicToken, setPublicToken] = useState('')
  const [tokenError, setTokenError] = useState('')
  const [loadError, setLoadError] = useState('')

  // Tracks whether the modal was opened by the auto-enroll path so we don't
  // double-fire if the effect re-runs.
  const autoEnrollTriggeredRef = useRef(false)

  useEffect(() => {
    window.scrollTo(0, 0)
    if (id) loadCurso()
  }, [id])

  useEffect(() => {
    const token = searchParams.get('token')?.trim() ?? ''
    if (!token) return
    setPublicToken(token)
    resolvePublicEnrollmentLink(token)
      .then(link => {
        if (String(link.course.id) !== id) {
          setTokenError('El enlace no corresponde a este curso')
        }
      })
      .catch(err => setTokenError(err instanceof Error ? err.message : 'Token inválido'))
  }, [id, searchParams])

  const loadCurso = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const c = await getCurso(id!)
      setCurso(c)
      setFacilitadorNombre(c.instructor)
    } catch {
      setLoadError('No se pudo cargar el curso')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Performs the public enrollment against the backend, persists the
   * round-trip state if the participant is unknown, and updates the UI.
   *
   * - `{ kind: 'enrollment' }` → success state, increment counter.
   * - `{ kind: 'redirect' }` → store the pending intent and navigate to
   *   the registration page so the user can complete the round-trip.
   * - Errors surface in `formError` and leave sessionStorage intact for
   *   manual retry.
   */
  const runEnrollment = async (rawDui: string) => {
    if (!publicToken) {
      setFormError('La inscripción pública requiere un enlace válido')
      return
    }
    const normalized = normalizeDui(rawDui)
    if (!normalized) {
      setFormError('DUI inválido (formato 00000000-0)')
      return
    }

    setFormError('')
    setSubmitting(true)
    try {
      const result = await inscribir({ cursoId: id!, dui: normalized }, publicToken)

      if (result.kind === 'redirect') {
        // Persist the round-trip so the user lands back here after registering.
        savePending({ token: publicToken, dui: normalized, courseId: id! })
        navigate(result.redirect)
        return
      }

      // Enrolled.
      clearPending()
      setSuccess(true)
      if (curso) {
        setCurso({ ...curso, inscritos: curso.inscritos + 1 })
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error al inscribir')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInscribir = async (e: React.FormEvent) => {
    e.preventDefault()
    await runEnrollment(formData.dui)
  }

  // Auto-enroll on mount when a pending round-trip matches this course.
  // Runs after the modal state settles so React renders the open modal
  // before firing the network request.
  useEffect(() => {
    if (!publicToken || !id) return
    if (showForm || success) return
    if (autoEnrollTriggeredRef.current) return

    const pending = loadPending()
    if (!pending) return
    if (!matchesPending(pending, id, publicToken)) return

    autoEnrollTriggeredRef.current = true
    setFormData({ dui: pending.dui })
    setShowForm(true)
    // Defer so the modal mounts before the request fires.
    setTimeout(() => {
      void runEnrollment(pending.dui)
    }, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicToken, id])

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-display text-3xl text-ivory">{loadError}</h1>
          <p className="text-warm-gray">Revisá la conexión con la API o volvé al catálogo.</p>
          <Link to="/cursos" className="inline-flex items-center gap-2 px-5 py-3 bg-gold text-charcoal rounded-xl font-semibold">
            Volver a cursos
          </Link>
        </div>
      </div>
    )
  }

  if (!curso) return null

  const cuposRestantes = curso.cupoMaximo - curso.inscritos
  const puedeInscribirse = curso.estado === 'abierto' && cuposRestantes > 0

  return (
    <div className="min-h-screen bg-charcoal">
      {/* Back + Hero Image */}
      <div className="relative h-[40vh] md:h-[50vh] overflow-hidden">
        <img
          src={curso.imagen || FALLBACK_COURSE_IMAGE}
          alt={curso.nombre}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.src = FALLBACK_COURSE_IMAGE }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/50 to-transparent" />
        <div className="absolute top-6 left-6 z-10">
          <Link to="/cursos" className="flex items-center gap-2 text-ivory/70 hover:text-gold text-sm transition-colors">
            <ChevronLeft className="w-4 h-4" /> Volver a cursos
          </Link>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-3 py-1 bg-gold/20 text-gold text-[10px] font-mono tracking-wider uppercase rounded-md border border-gold/20">{curso.categoria}</span>
              <span className="px-3 py-1 bg-ivory/10 text-ivory/80 text-[10px] font-mono tracking-wider uppercase rounded-md border border-ivory/10">{curso.nivel}</span>
              {curso.precio === 0 && (
                <span className="px-3 py-1 bg-success/20 text-success text-[10px] font-mono tracking-wider uppercase rounded-md border border-success/20">Gratuito</span>
              )}
            </div>
            <h1 className="font-display text-3xl md:text-5xl text-ivory leading-[0.95]">{curso.nombre}</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Left - Info */}
          <div className="lg:col-span-2 space-y-10">
            <AnimatedSection>
              <h2 className="font-display text-2xl text-ivory mb-4">Sobre el curso</h2>
              <p className="text-warm-gray leading-relaxed">{curso.descripcion}</p>
                {publicToken && (
                  <div className="mt-4 rounded-xl border border-gold/20 bg-gold/5 p-4 text-sm text-ivory/80">
                    <p className="font-medium text-gold">Inscripción pública activa</p>
                    <p className="mt-1">{curso.nombre}</p>
                    <p>{curso.instructor}</p>
                    {tokenError && <p className="mt-2 text-error">{tokenError}</p>}
                  </div>
                )}
            </AnimatedSection>

            <AnimatedSection>
              <h2 className="font-display text-2xl text-ivory mb-4">Instructor</h2>
                <div className="flex items-start gap-4 bg-charcoal-light rounded-xl p-5 border border-warm-tan/10">
                  <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-gold" />
                  </div>
                  <div>
                    <p className="text-ivory font-medium">{curso.instructor}</p>
                    {facilitadorNombre && (
                      <p className="text-warm-gray text-sm mt-1">Facilitador: {facilitadorNombre}</p>
                    )}
                    <p className="text-warm-gray text-sm mt-1 leading-relaxed">{curso.instructorBio}</p>
                  </div>
                </div>
            </AnimatedSection>

            {/* Tags */}
            <AnimatedSection>
              <div className="flex flex-wrap gap-2">
                {curso.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 bg-charcoal-lighter text-warm-gray text-xs rounded-lg border border-warm-tan/10">
                    <Tag className="w-3 h-3" />{tag}
                  </span>
                ))}
              </div>
            </AnimatedSection>

            {/* Map */}
            <AnimatedSection>
              <h2 className="font-display text-2xl text-ivory mb-4">Ubicación</h2>
              <div className="rounded-xl overflow-hidden border border-warm-tan/10 h-64 bg-charcoal-light relative">
                {curso.lat && curso.lng ? (
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0, filter: 'grayscale(100%) invert(92%) contrast(83%)' }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${curso.lng - 0.005},${curso.lat - 0.005},${curso.lng + 0.005},${curso.lat + 0.005}&layer=mapnik&marker=${curso.lat},${curso.lng}`}
                  />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-warm-gray">
                      <div className="text-center">
                        <MapPin className="w-8 h-8 mx-auto mb-2 text-gold" />
                        <p className="text-sm">{curso.municipio}, {curso.departamento}</p>
                      </div>
                    </div>
                )}
              </div>
              <p className="mt-3 text-sm text-warm-gray flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gold" />{curso.ubicacion}
              </p>
            </AnimatedSection>
          </div>

          {/* Right - Sidebar Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <AnimatedSection>
                <div className="bg-charcoal-light rounded-2xl p-6 border border-warm-tan/10">
                  {/* Price */}
                  <div className="mb-6">
                    {curso.precio > 0 ? (
                      <div>
                        {curso.precioOriginal && (
                          <span className="text-sm text-warm-gray line-through">${curso.precioOriginal} USD</span>
                        )}
                        <p className="text-3xl font-display text-gold">${curso.precio} <span className="text-base text-warm-gray">USD</span></p>
                      </div>
                    ) : (
                      <p className="text-3xl font-display text-success">Gratuito</p>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="w-4 h-4 text-gold flex-shrink-0" />
                      <span className="text-ivory">{new Date(curso.fechaInicio).toLocaleDateString('es-SV', { day: 'numeric', month: 'long' })} - {new Date(curso.fechaFin).toLocaleDateString('es-SV', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Clock className="w-4 h-4 text-gold flex-shrink-0" />
                      <span className="text-ivory">{curso.horario}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Users className="w-4 h-4 text-gold flex-shrink-0" />
                      <span className="text-ivory">{curso.inscritos} de {curso.cupoMaximo} inscritos</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-gold flex-shrink-0" />
                      <span className="text-ivory text-sm">{curso.municipio}, {curso.departamento}</span>
                    </div>
                  </div>

                  {/* Cupos bar */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="text-warm-gray">Cupo</span>
                      <span className={`font-medium ${cuposRestantes <= 3 ? 'text-error' : 'text-gold'}`}>{cuposRestantes} disponibles</span>
                    </div>
                    <div className="h-2 bg-warm-tan/20 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${(curso.inscritos / curso.cupoMaximo) >= 0.9 ? 'bg-error' : (curso.inscritos / curso.cupoMaximo) >= 0.7 ? 'bg-gold' : 'bg-success'}`} style={{ width: `${(curso.inscritos / curso.cupoMaximo) * 100}%` }} />
                    </div>
                  </div>

                  {/* CTA */}
                  {puedeInscribirse && !success && !tokenError && (
                    <button
                      onClick={() => setShowForm(true)}
                      className="w-full py-3.5 bg-gold text-charcoal text-sm font-semibold rounded-xl hover:bg-gold-light transition-all"
                    >
                      Inscribirme ahora
                    </button>
                  )}
                  {tokenError && (
                    <div className="w-full py-3.5 bg-error/10 text-error text-sm font-medium rounded-xl text-center border border-error/20">
                      {tokenError}
                    </div>
                  )}

                  {curso.estado === 'lleno' && (
                    <div className="w-full py-3.5 bg-warm-tan/10 text-warm-gray text-sm font-medium rounded-xl text-center border border-warm-tan/20">
                      Cupo completo
                    </div>
                  )}

                  {curso.estado === 'proximamente' && (
                    <div className="w-full py-3.5 bg-gold/10 text-gold text-sm font-medium rounded-xl text-center border border-gold/20">
                      Próximamente
                    </div>
                  )}

                  {/* Success */}
                  {success && (
                    <div className="p-4 bg-success/10 border border-success/20 rounded-xl text-center">
                      <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
                      <p className="text-ivory font-medium text-sm">¡Inscripción confirmada!</p>
                      <p className="text-warm-gray text-xs mt-1">Te hemos enviado un correo con los detalles.</p>
                    </div>
                  )}
                </div>
              </AnimatedSection>
            </div>
          </div>
        </div>
      </div>

      {/* Inscription Modal (DUI-only, PR3 contract) */}
      {showForm && !success && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => !submitting && setShowForm(false)}
          data-testid="curso-detalle-enrollment-modal"
        >
          <div
            className="bg-charcoal-light rounded-2xl max-w-md w-full p-6 border border-warm-tan/20 shadow-glow"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-display text-2xl text-ivory">Inscripción</h3>
            <p className="text-sm text-warm-gray mt-1">{curso.nombre}</p>

            <form onSubmit={handleInscribir} className="mt-6 space-y-4">
              <div>
                <label className="text-[10px] text-warm-gray uppercase tracking-wider">DUI *</label>
                <input
                  name="dui"
                  type="text"
                  value={formData.dui}
                  onChange={e => setFormData(p => ({ ...p, dui: e.target.value }))}
                  className="mt-1.5 w-full px-4 py-3 bg-charcoal border border-warm-tan/20 rounded-xl text-sm text-ivory placeholder:text-warm-gray focus:outline-none focus:border-gold/50"
                  placeholder="00000000-0"
                  pattern={"\\d{8}-\\d"}
                  inputMode="numeric"
                  maxLength={10}
                  required
                  data-testid="curso-detalle-dui-input"
                />
                <p className="mt-1 text-[11px] text-warm-gray">Formato: 8 dígitos, guion, 1 dígito (00000000-0).</p>
              </div>

              {formError && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
                  <p className="text-xs text-error" data-testid="curso-detalle-enrollment-error">{formError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                  className="flex-1 py-3 border border-warm-tan/20 text-warm-gray text-sm rounded-xl hover:border-warm-tan/40 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-gold text-charcoal text-sm font-semibold rounded-xl hover:bg-gold-light transition-colors disabled:opacity-50"
                  data-testid="curso-detalle-enrollment-submit"
                >
                  {submitting ? 'Procesando...' : 'Confirmar inscripción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}