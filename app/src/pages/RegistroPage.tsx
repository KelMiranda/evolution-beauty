import { useState, useEffect, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronRight, ChevronLeft, CheckCircle2, User, Phone, BookOpen } from 'lucide-react'
import { createRegistro, getCursos } from '@/services/api'
import { departamentosElSalvador, municipiosPorDepartamento, funcionesACOES, nivelesEducativos, paisesCentroamerica } from '@/data/mockData'
import type { Registro } from '@/types'

const steps = [
  { num: 1, title: 'Datos Personales', icon: User },
  { num: 2, title: 'Contacto', icon: Phone },
  { num: 3, title: 'Confirmar', icon: BookOpen },
]

const initialForm: Omit<Registro, 'id' | 'codigo' | 'fechaRegistro' | 'estado'> = {
  courseId: '',
  nombre: '', dui: '', fechaNacimiento: '', genero: '', pais: 'El Salvador',
  prefijo: '+503', celular: '', correo: '', direccion: '', distrito: '',
  departamento: '', municipio: '', entidad: '', funcion: '',
  nivelEducativo: '', capacitacion: '', autorizaDatos: false, observaciones: '',
}

export function RegistroPage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [newRegistro, setNewRegistro] = useState<Registro | null>(null)
  const [submissionError, setSubmissionError] = useState('')
  const [cursos, setCursos] = useState<Array<{ id: string; nombre: string }>>([])

  useEffect(() => {
    window.scrollTo(0, 0)
    getCursos({ estado: 'enrolling' })
      .then(data => setCursos(data.map(curso => ({ id: curso.id, nombre: curso.nombre }))))
      .catch(console.error)
  }, [])

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
      if (!form.courseId) newErrors.courseId = 'Selecciona'
      if (!form.entidad.trim()) newErrors.entidad = 'Requerido'
      if (!form.funcion) newErrors.funcion = 'Selecciona'
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
    try {
      const result = await createRegistro(form)
      setNewRegistro(result)
    } catch (err) {
      console.error(err)
      setSubmissionError('No se pudo completar el registro')
    }
    finally {
      setSubmitted(true)
    }
  }

  const municipios = form.departamento ? municipiosPorDepartamento[form.departamento] || [] : []

  const reviewGroups = [
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
    { title: 'Adicional', fields: [
      { label: 'Curso', value: cursos.find(curso => curso.id === form.courseId)?.nombre ?? '' },
      { label: 'Entidad', value: form.entidad },
      { label: 'Función', value: form.funcion },
      { label: 'Nivel educativo', value: form.nivelEducativo },
      { label: 'Capacitación', value: form.capacitacion },
    ]},
  ]

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
              <span className="font-mono text-[11px] tracking-wider uppercase text-gold">Nuevo participante</span>
              <h1 className="mt-4 font-display text-4xl text-ivory leading-tight">
                Registro al directorio ACOES
              </h1>
              <p className="mt-4 text-warm-gray text-sm leading-relaxed">
                Completa el formulario para validar tu información antes de guardarla.
              </p>
              <div className="mt-8 space-y-3">
                {['Registro centralizado con código único', 'Validación previa antes de guardar', 'Base lista para reportes'].map((t, i) => (
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
                    <Field label="Documento / DUI" value={form.dui} onChange={v => updateField('dui', v)} error={errors.dui} placeholder="00000000-0" />
                  </div>
                  <Field label="Fecha de nacimiento" type="date" value={form.fechaNacimiento} onChange={v => updateField('fechaNacimiento', v)} error={errors.fechaNacimiento} />
                  <div className="grid md:grid-cols-2 gap-5">
                    <Select label="Género" value={form.genero} onChange={v => updateField('genero', v)} error={errors.genero} options={['Femenino', 'Masculino']} />
                    <Select label="País" value={form.pais} onChange={v => updateField('pais', v)} options={paisesCentroamerica} />
                  </div>
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
                    <div>
                      <label htmlFor="courseId" className="text-[10px] text-warm-gray uppercase tracking-wider">Curso</label>
                      <select id="courseId" name="courseId" aria-label="Curso" value={form.courseId} onChange={e => updateField('courseId', e.target.value)} className={`mt-1.5 w-full px-4 py-3 bg-charcoal border rounded-xl text-sm text-ivory focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/50 appearance-none transition-all ${errors.courseId ? 'border-error/50' : 'border-warm-tan/20'}`}>
                        <option value="">Selecciona</option>
                        {cursos.map(curso => <option key={curso.id} value={curso.id}>{curso.nombre}</option>)}
                      </select>
                      {errors.courseId && <p className="mt-1 text-xs text-error">{errors.courseId}</p>}
                    </div>
                    <Field label="Entidad / organización" value={form.entidad} onChange={v => updateField('entidad', v)} error={errors.entidad} />
                    <div className="grid md:grid-cols-2 gap-5">
                      <Select label="Función en ACOES" value={form.funcion} onChange={v => updateField('funcion', v)} error={errors.funcion} options={funcionesACOES} />
                      <Select label="Nivel educativo" value={form.nivelEducativo} onChange={v => updateField('nivelEducativo', v)} options={nivelesEducativos} />
                    </div>
                    <Field label="Capacitación" value={form.capacitacion} onChange={v => updateField('capacitacion', v)} placeholder="Ej: taller o seguimiento" />
                    <div>
                      <label htmlFor="observaciones" className="text-[10px] text-warm-gray uppercase tracking-wider">Observaciones</label>
                      <textarea id="observaciones" name="observaciones" aria-label="Observaciones" value={form.observaciones} onChange={e => updateField('observaciones', e.target.value)} placeholder="Notas adicionales" className="mt-1.5 w-full px-4 py-3 bg-charcoal border border-warm-tan/20 rounded-xl text-sm text-ivory placeholder:text-warm-gray/50 focus:outline-none focus:border-gold/50 resize-none h-24" />
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

function Field({ label, type = 'text', value, onChange, error, placeholder, disabled }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; error?: string; placeholder?: string; disabled?: boolean
}) {
  const id = label.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return (
    <div>
      <label htmlFor={id} className="text-[10px] text-warm-gray uppercase tracking-wider">{label}</label>
      <input id={id} name={id} aria-label={label} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        className={`mt-1.5 w-full px-4 py-3 bg-charcoal border rounded-xl text-sm text-ivory placeholder:text-warm-gray/50 focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/50 transition-all ${error ? 'border-error/50' : 'border-warm-tan/20'} ${disabled ? 'opacity-50' : ''}`} />
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  )
}

function Select({ label, value, onChange, error, options, disabled }: {
  label: string; value: string; onChange: (v: string) => void; error?: string; options: string[]; disabled?: boolean
}) {
  const id = label.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return (
    <div>
      <label htmlFor={id} className="text-[10px] text-warm-gray uppercase tracking-wider">{label}</label>
      <select id={id} name={id} aria-label={label} value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        className={`mt-1.5 w-full px-4 py-3 bg-charcoal border rounded-xl text-sm text-ivory focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/50 appearance-none transition-all ${error ? 'border-error/50' : 'border-warm-tan/20'} ${disabled ? 'opacity-50' : ''}`}>
        <option value="">Selecciona</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  )
}
