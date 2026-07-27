import { useState, useEffect, useMemo, type FormEvent } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Check, ChevronRight, ChevronLeft, CheckCircle2, AlertCircle, Info, User, Phone, BookOpen } from 'lucide-react'
import { createRegistro, getCursos, ValidationApiError } from '@/services/api'
import { safeRedirect } from '@/lib/safeRedirect'
import { normalizeDui, formatDuiInput } from '@/lib/dui'
import { departamentosElSalvador, municipiosPorDepartamento, nivelesEducativos, paisesCentroamerica } from '@/data/mockData'
import type { Registro } from '@/types'

/**
 * Public registration exposes only Participante and Facilitador. The admin
 * four-value catalog (`Empleado`, `Facilitador`, `Participante`, `Otro`)
 * remains untouched on the backend — see
 * `openspec/changes/acoes-dui-enrollment-flow/specs/public-registration-enum-funcion/spec.md`.
 *
 * We inline the public two-value list here rather than importing the backend
 * catalog to keep the SPA bundle free of server-only modules.
 */
const PUBLIC_PARTICIPANT_ROLES = ['Participante', 'Facilitador'] as const
type PublicParticipantRole = (typeof PUBLIC_PARTICIPANT_ROLES)[number]

/**
 * Maps the shared Zod schema's camelCase field names (returned in the
 * 400 validation_failed envelope) to the RegistroPage form field names
 * used in the `errors` state.
 */
const backendFieldToFormField: Record<string, string> = {
  courseId: 'courseId',
  fullName: 'nombre',
  documentNumber: 'dui',
  birthDate: 'fechaNacimiento',
  gender: 'genero',
  phoneCountry: 'pais',
  phoneDialCode: 'prefijo',
  phoneNumber: 'celular',
  phone: 'celular',
  email: 'correo',
  address: 'direccion',
  municipality: 'municipio',
  department: 'departamento',
  district: 'distrito',
  organization: 'entidad',
  roleFunction: 'funcion',
  educationLevel: 'nivelEducativo',
  program: 'capacitacion',
  status: 'estado',
  notes: 'observaciones',
  consent: 'autorizaDatos',
}

const steps = [
  { num: 1, title: 'Datos Personales', icon: User },
  { num: 2, title: 'Contacto', icon: Phone },
  { num: 3, title: 'Confirmar', icon: BookOpen },
]

/**
 * Maps a form field name (as it appears in `errors` after submit) to the
 * step number that contains it. Used to jump to the correct step on
 * validation failure so the user can actually see the field that's
 * failing (the previous implementation always jumped to step 1, which
 * hid errors for fields like `courseId` and `capacitacion` that live on
 * step 3).
 */
const stepForField = (field: string): number | null => {
  if (['nombre', 'dui', 'fechaNacimiento', 'genero', 'pais', 'funcion'].includes(field)) return 1
  if (['prefijo', 'celular', 'correo', 'direccion', 'distrito', 'departamento', 'municipio'].includes(field)) return 2
  if (['courseId', 'entidad', 'capacitacion', 'nivelEducativo', 'observaciones', 'autorizaDatos'].includes(field)) return 3
  return null
}

const fieldLabels: Record<string, string> = {
  nombre: 'Nombre',
  dui: 'DUI',
  fechaNacimiento: 'Fecha de nacimiento',
  genero: 'Género',
  pais: 'País',
  funcion: 'Función en ACOES',
  prefijo: 'Prefijo',
  celular: 'Celular',
  correo: 'Correo',
  direccion: 'Dirección',
  distrito: 'Distrito',
  departamento: 'Departamento',
  municipio: 'Municipio',
  courseId: 'Curso',
  entidad: 'Entidad / organización',
  capacitacion: 'Capacitación',
  nivelEducativo: 'Nivel educativo',
  observaciones: 'Observaciones',
  autorizaDatos: 'Autorización de datos',
}

/**
 * Form state typed loosely: `funcion` is the user-controlled public-role
 * selector (`'Participante' | 'Facilitador' | ''`), and `curso`/`capacitacion`
 * are only meaningful when `funcion === 'Facilitador'`. `observaciones` is no
 * longer surfaced in the public form but kept in the state for type
 * compatibility with the `Registro` interface (the field is always `''`).
 */
type FormState = Omit<Registro, 'id' | 'codigo' | 'fechaRegistro' | 'estado' | 'funcion'> & {
  funcion: PublicParticipantRole | ''
}

const initialForm: FormState = {
  courseId: '',
  nombre: '', dui: '', fechaNacimiento: '', genero: '', pais: 'El Salvador',
  prefijo: '+503', celular: '', correo: '', direccion: '', distrito: '',
  departamento: '', municipio: '', entidad: '', funcion: '',
  nivelEducativo: '', capacitacion: '', autorizaDatos: false, observaciones: '',
}

export function RegistroPage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>(initialForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [newRegistro, setNewRegistro] = useState<Registro | null>(null)
  const [submissionError, setSubmissionError] = useState('')
  const [cursos, setCursos] = useState<Array<{ id: string; nombre: string }>>([])

  // Read the post-registration continuation target from the URL. With
  // HashRouter the actual URL is `/#/registro?redirect=...`, so
  // `useSearchParams` decodes the inner query string for us. The raw value
  // is validated by `safeRedirect` after a successful 201 response.
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const redirectTarget = useMemo(() => {
    const raw = searchParams.get('redirect') ?? ''
    return raw
  }, [searchParams])

  useEffect(() => {
    window.scrollTo(0, 0)
    getCursos({ estado: 'enrolling' })
      .then(data => setCursos(data.map(curso => ({ id: curso.id, nombre: curso.nombre }))))
      .catch(console.error)
  }, [])

  /**
   * When the user toggles from `Facilitador` back to `Participante` we MUST
   * drop any stale values the facilitator step accumulated; the public
   * schema (PR1) treats the missing fields as no-ops but the user's
   * intent is to register as a participant, so we keep the form state
   * consistent with what they see on screen.
   */
  useEffect(() => {
    if (form.funcion !== 'Participante') return
    setForm(prev => (prev.courseId === '' && prev.capacitacion === '' ? prev : { ...prev, courseId: '', capacitacion: '' }))
    setErrors(prev => {
      if (!prev.courseId && !prev.capacitacion) return prev
      const next = { ...prev }
      delete next.courseId
      delete next.capacitacion
      return next
    })
  }, [form.funcion])

  const updateField = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  const validateStep = () => {
    const newErrors: Record<string, string> = {}
    if (step === 1) {
      if (!form.nombre.trim()) newErrors.nombre = 'Requerido'
      if (!form.dui.trim()) newErrors.dui = 'Requerido'
      if (!form.fechaNacimiento) newErrors.fechaNacimiento = 'Requerido'
      if (!form.genero) newErrors.genero = 'Selecciona'
      if (!form.funcion) newErrors.funcion = 'Selecciona'
    }
    if (step === 2) {
      if (!form.celular.trim()) newErrors.celular = 'Requerido'
      if (!form.correo.trim()) newErrors.correo = 'Requerido'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) newErrors.correo = 'Inválido'
      if (!form.direccion.trim()) newErrors.direccion = 'Requerido'
      if (!form.departamento) newErrors.departamento = 'Selecciona'
      if (!form.municipio) newErrors.municipio = 'Selecciona'
    }
    if (step === 3) {
      if (form.funcion === 'Facilitador') {
        if (!form.courseId) newErrors.courseId = 'Selecciona'
        if (!form.capacitacion.trim()) newErrors.capacitacion = 'Describe la capacitación'
      }
      if (!form.entidad.trim()) newErrors.entidad = 'Requerido'
      if (!form.autorizaDatos) newErrors.autorizaDatos = 'Debes autorizar'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (!validateStep()) return false
    if (step < 3) setStep(s => s + 1)
    else handleSubmit()
    return true
  }

  const prevStep = () => { setStep(s => s - 1) }

  const handleSubmit = async () => {
    setSubmissionError('')
    // Normalize DUI on the client so the wire payload matches the canonical
    // form before the backend re-validates. Empty input short-circuits to
    // null so the backend's `normalizeDui` is the authoritative validator.
    const normalizedDui = normalizeDui(form.dui)
    try {
      const result = await createRegistro({ ...form, dui: normalizedDui ?? form.dui })
      setNewRegistro(result)
      setSubmitted(true)
      const safe = safeRedirect(redirectTarget)
      if (safe) {
        // Defer the navigation by a tick so the success card has a chance to
        // paint. With HashRouter, `navigate('/cursos/9?token=XYZ')` rewrites
        // the hash to `#/cursos/9?token=XYZ` and triggers the CursoDetallePage
        // mount. The success card is replaced by the course detail page.
        window.setTimeout(() => navigate(safe), 0)
      }
    } catch (err) {
      console.error(err)
      if (err instanceof ValidationApiError) {
        const fieldErrors: Record<string, string> = {}
        for (const issue of err.issues) {
          const backendField = String(issue.path[0] ?? '')
          const formField = backendFieldToFormField[backendField] ?? backendField
          if (!fieldErrors[formField]) {
            fieldErrors[formField] = issue.message
          }
        }
        setErrors(fieldErrors)
        // Jump to the step that contains the first error field instead of
        // always step 1, so the user can actually see the field that's
        // failing (e.g. `courseId` and `capacitacion` are on step 3, not
        // step 1; jumping to step 1 made the error invisible).
        const firstField = Object.keys(fieldErrors)[0]
        if (firstField) {
          const targetStep = stepForField(firstField)
          if (targetStep !== null && targetStep !== step) {
            setStep(targetStep)
          }
          window.requestAnimationFrame(() => {
            const el = document.querySelector<HTMLElement>(`[name="${firstField}"]`)
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          })
        }
        return
      }
      setSubmissionError('No se pudo completar el registro')
    }
  }

  const municipios = form.departamento ? municipiosPorDepartamento[form.departamento] || [] : []

  /**
   * Review groups are computed at render time so the cards the user sees in
   * step 3 match the actual submission payload — `curso` / `capacitación`
   * only appear for `Facilitador`, and `observaciones` never appears.
   */
  const reviewGroups = useMemo(() => {
    const adicionalesFields: Array<{ label: string; value: string }> = []
    if (form.funcion === 'Facilitador') {
      adicionalesFields.push({ label: 'Curso', value: cursos.find(curso => curso.id === form.courseId)?.nombre ?? '' })
      adicionalesFields.push({ label: 'Capacitación', value: form.capacitacion })
    }
    adicionalesFields.push({ label: 'Entidad', value: form.entidad })
    adicionalesFields.push({ label: 'Función', value: form.funcion })
    adicionalesFields.push({ label: 'Nivel educativo', value: form.nivelEducativo })
    return [
      { title: 'Datos Personales', fields: [
        { label: 'Nombre', value: form.nombre },
        { label: 'DUI', value: form.dui },
        { label: 'Nacimiento', value: form.fechaNacimiento },
        { label: 'Género', value: form.genero },
        { label: 'País', value: form.pais },
      ]},
      { title: 'Contacto', fields: [
        { label: 'Celular', value: `${form.prefijo} ${form.celular}` },
        { label: 'Correo', value: form.correo },
        { label: 'Dirección', value: form.direccion },
        { label: 'Distrito', value: form.distrito },
        { label: 'Departamento', value: form.departamento },
        { label: 'Municipio', value: form.municipio },
      ]},
      { title: 'Adicional', fields: adicionalesFields },
    ]
  }, [form, cursos])

  if (submitted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6 py-20 bg-charcoal">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-success" />
          </div>
          <h2 className="mt-6 font-display text-3xl text-ivory">Registro exitoso</h2>
          <p className="mt-3 text-warm-gray">Tu información ha sido guardada.</p>
          <div className="mt-6 bg-charcoal-light rounded-xl p-6 border border-warm-tan/10">
            <span className="font-mono text-[10px] tracking-wider uppercase text-warm-gray">Código</span>
            <p className="mt-1 font-mono text-2xl text-gold">{newRegistro?.codigo ?? 'PENDIENTE'}</p>
          </div>
          {submissionError && <p className="mt-4 text-sm text-error">{submissionError}</p>}
          <div className="mt-8 flex gap-4 justify-center">
            <button onClick={() => { setSubmitted(false); setStep(1); setForm(initialForm) }} className="px-6 py-2.5 bg-gold text-charcoal text-sm font-semibold rounded-xl hover:bg-gold-light transition-colors">
              Nuevo registro
            </button>
            <Link to="/" className="px-6 py-2.5 border border-warm-tan/20 text-ivory text-sm rounded-xl hover:border-gold/30 transition-colors">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (step === 3) {
      handleSubmit()
      return
    }
    nextStep()
  }

  return (
    <div className="min-h-screen bg-charcoal py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-12">
          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-24">
              <span className="font-mono text-[11px] tracking-wider uppercase text-gold">Registro</span>
              <h1 className="mt-4 font-display text-4xl text-ivory leading-tight">
                Registro de participantes y facilitadores
              </h1>
              <p className="mt-4 text-warm-gray text-sm leading-relaxed">
                Elige tu rol para registrarte. Los <span className="text-ivory font-medium">participantes</span> se inscriben en actividades abiertas; los <span className="text-ivory font-medium">facilitadores</span> pueden proponer cursos y capacitaciones. Empleados y otros roles los gestiona el administrador.
              </p>
              <div className="mt-8 space-y-3">
                {['Validación previa antes de guardar', 'Código único de seguimiento', 'Base lista para reportes'].map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-gold flex-shrink-0" />
                    <span className="text-sm text-ivory/70">{t}</span>
                  </div>
                ))}
              </div>

              <div className="mt-12 space-y-4">
                {steps.map(s => {
                  const isActive = s.num === step
                  const isCompleted = s.num < step
                  return (
                    <div key={s.num} className={`flex items-center gap-3 transition-all ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${isCompleted ? 'bg-success text-ivory' : isActive ? 'bg-gold text-charcoal' : 'bg-warm-tan/20 text-warm-gray'}`}>
                        {isCompleted ? <Check className="w-4 h-4" /> : s.num}
                      </div>
                      <span className={`text-sm ${isActive ? 'text-ivory font-medium' : 'text-warm-gray'}`}>{s.title}</span>
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 h-1 bg-warm-tan/10 rounded-full overflow-hidden">
                <div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-8">
            <div
              role="note"
              aria-label="Información sobre los roles disponibles en el registro público"
              data-testid="registro-role-banner"
              className="mb-6 flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/5 p-4 md:p-5"
            >
              <Info className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-sm text-ivory/85 leading-relaxed">
                <p>
                  Elige <span className="font-semibold text-ivory">Participante</span> o <span className="font-semibold text-ivory">Facilitador</span>. Empleados y otros roles los gestiona el administrador desde el{' '}
                  <Link to="/login" className="text-gold underline underline-offset-2 hover:text-gold-light">
                    panel de control
                  </Link>
                  .
                </p>
              </div>
            </div>

            {(submissionError || Object.keys(errors).length > 0) && step !== 3 && (
              <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/30 text-error flex items-start gap-3" role="alert" data-testid="submit-error-banner">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold">No se pudo completar el registro</p>
                  {submissionError && <p className="mt-1 text-sm">{submissionError}</p>}
                  {Object.keys(errors).length > 0 && (
                    <ul className="mt-2 text-sm space-y-0.5">
                      {Object.entries(errors).map(([field, msg]) => (
                        <li key={field}>
                          • <strong>{fieldLabels[field] ?? field}:</strong> {msg}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            <form className="bg-charcoal-light rounded-2xl border border-warm-tan/10 p-6 md:p-10" onSubmit={handleFormSubmit}>
              {step === 3 && (
                <div className="mb-8">
                  <h3 className="font-display text-xl text-ivory">Revisa tu información</h3>
                  <p className="text-sm text-warm-gray mt-1">Verifica que los datos sean correctos.</p>
                </div>
              )}

              {/* Step 1 */}
              {step === 1 && (
                <div className="space-y-6">
                  <h3 className="font-display text-xl text-ivory">Datos Personales</h3>
                  <div className="grid md:grid-cols-2 gap-5">
                    <Field label="Nombre completo" value={form.nombre} onChange={v => updateField('nombre', v)} error={errors.nombre} />
                    <Field
                      label="Documento / DUI"
                      value={form.dui}
                      onChange={v => updateField('dui', formatDuiInput(v))}
                      error={errors.dui}
                      placeholder="00000000-0"
                      pattern={"\\d{8}-\\d"}
                      maxLength={10}
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </div>
                  <Field label="Fecha de nacimiento" type="date" value={form.fechaNacimiento} onChange={v => updateField('fechaNacimiento', v)} error={errors.fechaNacimiento} />
                  <div className="grid md:grid-cols-2 gap-5">
                    <Select label="Género" value={form.genero} onChange={v => updateField('genero', v)} error={errors.genero} options={['Femenino', 'Masculino']} />
                    <Select label="País" value={form.pais} onChange={v => updateField('pais', v)} options={paisesCentroamerica} />
                  </div>
                  <Select
                    label="Rol en ACOES"
                    value={form.funcion}
                    onChange={v => updateField('funcion', v)}
                    error={errors.funcion}
                    options={[...PUBLIC_PARTICIPANT_ROLES]}
                    required
                  />
                </div>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <div className="space-y-6">
                  <h3 className="font-display text-xl text-ivory">Contacto y Ubicación</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1"><Field label="Prefijo" value={form.prefijo} onChange={v => updateField('prefijo', v)} /></div>
                    <div className="col-span-2"><Field label="Celular" value={form.celular} onChange={v => updateField('celular', v)} error={errors.celular} placeholder="7000-0000" /></div>
                  </div>
                  <Field label="Correo" type="email" value={form.correo} onChange={v => updateField('correo', v)} error={errors.correo} />
                  <Field label="Dirección" value={form.direccion} onChange={v => updateField('direccion', v)} error={errors.direccion} />
                  <Field label="Distrito" value={form.distrito} onChange={v => updateField('distrito', v)} />
                  <div className="grid md:grid-cols-2 gap-5">
                    <Select label="Departamento" value={form.departamento} onChange={v => { updateField('departamento', v); updateField('municipio', ''); }} error={errors.departamento} options={departamentosElSalvador} />
                    <Select label="Municipio" value={form.municipio} onChange={v => updateField('municipio', v)} error={errors.municipio} options={municipios} disabled={!form.departamento} />
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {step === 3 && (
                <div className="space-y-8">
                  {reviewGroups.map((group, gi) => (
                    <div key={gi}>
                      <h4 className="font-mono text-[10px] tracking-wider uppercase text-warm-gray mb-3">{group.title}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {group.fields.map((field, fi) => (
                          <div key={fi} className="bg-charcoal/50 rounded-lg p-3 border border-warm-tan/5">
                            <span className="text-[10px] text-warm-gray uppercase">{field.label}</span>
                            <p className="text-sm text-ivory font-medium mt-0.5">{field.value || '-'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <hr className="border-warm-tan/10" />

                  <div className="space-y-5">
                    <h3 className="font-display text-xl text-ivory">Información adicional</h3>

                    {/* Conditional course/training fields. Render only for Facilitador
                        to satisfy `conditional-form-fields-by-funcion` spec. */}
                    {form.funcion === 'Facilitador' && (
                      <>
                        <div>
                          <label htmlFor="courseId" className="text-[10px] text-warm-gray uppercase tracking-wider">Curso</label>
                          <select id="courseId" name="courseId" aria-label="Curso" value={form.courseId} onChange={e => updateField('courseId', e.target.value)} className={`mt-1.5 w-full px-4 py-3 bg-charcoal border rounded-xl text-sm text-ivory focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/50 appearance-none transition-all ${errors.courseId ? 'border-error/50' : 'border-warm-tan/20'}`}>
                            <option value="">Selecciona</option>
                            {cursos.map(curso => <option key={curso.id} value={curso.id}>{curso.nombre}</option>)}
                          </select>
                          {errors.courseId && <p className="mt-1 text-xs text-error">{errors.courseId}</p>}
                        </div>
                        <Field
                          label="Capacitación"
                          value={form.capacitacion}
                          onChange={v => updateField('capacitacion', v)}
                          error={errors.capacitacion}
                          placeholder="Ej: taller o seguimiento"
                          required
                        />
                      </>
                    )}

                    <Field label="Entidad / organización" value={form.entidad} onChange={v => updateField('entidad', v)} error={errors.entidad} />

                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <span className="text-[10px] text-warm-gray uppercase tracking-wider">Rol en ACOES</span>
                        <p
                          data-testid="registro-role-summary"
                          className="mt-1.5 w-full px-4 py-3 bg-charcoal/60 border border-warm-tan/15 rounded-xl text-sm text-ivory flex items-center"
                        >
                          <span className="font-medium">{form.funcion || 'Sin seleccionar'}</span>
                        </p>
                      </div>
                      <Select label="Nivel educativo" value={form.nivelEducativo} onChange={v => updateField('nivelEducativo', v)} options={nivelesEducativos} />
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" name="autorizaDatos" aria-label="Autorizo el uso de mis datos para fines del registro ACOES" checked={form.autorizaDatos} onChange={e => updateField('autorizaDatos', e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-warm-tan/20 bg-charcoal text-gold focus:ring-gold/20" />
                      <span className="text-sm text-ivory/70">Autorizo el uso de mis datos para fines del registro ACOES</span>
                    </label>
                    {errors.autorizaDatos && <p className="text-xs text-error">{errors.autorizaDatos}</p>}
                  </div>
                </div>
              )}

              {/* Nav buttons */}
              <div className="mt-10 flex items-center justify-between pt-6 border-t border-warm-tan/10">
                {step > 1 ? (
                  <button type="button" onClick={prevStep} className="flex items-center gap-2 px-5 py-2.5 text-sm text-warm-gray hover:text-ivory transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Anterior
                  </button>
                ) : <div />}
                <button type="submit" className="flex items-center gap-2 px-6 py-3 bg-gold text-charcoal text-sm font-semibold rounded-xl hover:bg-gold-light transition-all">
                  {step === 3 ? 'Confirmar registro' : 'Siguiente'} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, type = 'text', value, onChange, error, placeholder, disabled, pattern, maxLength, inputMode, autoComplete, required }: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  error?: string
  placeholder?: string
  disabled?: boolean
  pattern?: string
  maxLength?: number
  inputMode?: 'numeric' | 'text' | 'tel' | 'email' | 'url' | 'search' | 'none' | 'decimal'
  autoComplete?: string
  required?: boolean
}) {
  const id = label.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return (
    <div>
      <label htmlFor={id} className="text-[10px] text-warm-gray uppercase tracking-wider">{label}</label>
      <input
        id={id}
        name={id}
        aria-label={label}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        pattern={pattern}
        maxLength={maxLength}
        inputMode={inputMode}
        autoComplete={autoComplete}
        required={required}
        className={`mt-1.5 w-full px-4 py-3 bg-charcoal border rounded-xl text-sm text-ivory placeholder:text-warm-gray/50 focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/50 transition-all ${error ? 'border-error/50' : 'border-warm-tan/20'} ${disabled ? 'opacity-50' : ''}`}
      />
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  )
}

function Select({ label, value, onChange, error, options, disabled, required }: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  options: readonly string[]
  disabled?: boolean
  required?: boolean
}) {
  const id = label.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return (
    <div>
      <label htmlFor={id} className="text-[10px] text-warm-gray uppercase tracking-wider">{label}</label>
      <select
        id={id}
        name={id}
        aria-label={label}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className={`mt-1.5 w-full px-4 py-3 bg-charcoal border rounded-xl text-sm text-ivory focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/50 appearance-none transition-all ${error ? 'border-error/50' : 'border-warm-tan/20'} ${disabled ? 'opacity-50' : ''}`}
      >
        <option value="">Selecciona</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  )
}