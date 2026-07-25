import { useState, useEffect } from 'react'
import { getCursos, deleteCurso, createCurso, updateCurso, reverseGeocode } from '@/services/api'
import { AnimatedSection } from '@/components/AnimatedSection'
import {
  Plus, Search, Pencil, Trash2, X, MapPin, Loader
} from 'lucide-react'
import type { Curso } from '@/types'
import { elSalvadorDepartments, municipalitiesByDepartment } from '@/lib/geo'
import { getFacilitatorsCached, resolveFacilitatorName } from '@/lib/facilitators'

const emptyCurso: Omit<Curso, 'id' | 'inscritos' | 'fechaRegistro'> = {
  nombre: '', descripcion: '', categoria: 'Colorimetría', nivel: 'Básico',
  precio: 0, imagen: '', fechaInicio: '', fechaFin: '', horario: '',
  ubicacion: '', departamento: '', municipio: '', lat: 0, lng: 0, cupoMaximo: 20, instructor: '',
  instructorBio: '', estado: 'abierto', tags: [], facilitadorId: '',
}

export function AdminCursosPage() {
  const [cursos, setCursos] = useState<Curso[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Curso | null>(null)
  const [form, setForm] = useState(emptyCurso)
  const [tagInput, setTagInput] = useState('')
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedMun, setSelectedMun] = useState('')
  const [loadingGeo, setLoadingGeo] = useState(false)
  const [latInput, setLatInput] = useState('')
  const [lngInput, setLngInput] = useState('')
  const [facilitators, setFacilitators] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => { load() }, [search])
  useEffect(() => { getFacilitatorsCached().then(setFacilitators).catch(() => setFacilitators([])) }, [])

  const load = async () => {
    setLoading(true)
    const data = await getCursos({ search: search || undefined })
    setCursos(data)
    setLoading(false)
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyCurso)
    setTagInput('')
    setSelectedDept('')
    setSelectedMun('')
    setLatInput('')
    setLngInput('')
    setShowModal(true)
  }

  const openEdit = (curso: Curso) => {
    setEditing(curso)
    setForm({
      nombre: curso.nombre, descripcion: curso.descripcion, categoria: curso.categoria,
      nivel: curso.nivel, precio: curso.precio, precioOriginal: curso.precioOriginal,
      imagen: curso.imagen, fechaInicio: curso.fechaInicio, fechaFin: curso.fechaFin,
      horario: curso.horario, ubicacion: curso.ubicacion, departamento: curso.departamento,
      municipio: curso.municipio, lat: curso.lat, lng: curso.lng,
      cupoMaximo: curso.cupoMaximo, instructor: curso.instructor, instructorBio: curso.instructorBio,
      facilitadorId: curso.facilitadorId ?? '',
      estado: curso.estado, tags: [...curso.tags],
    })
    setTagInput('')
    setSelectedDept(curso.departamento)
    setSelectedMun(curso.municipio)
    setLatInput(curso.lat ? String(curso.lat) : '')
    setLngInput(curso.lng ? String(curso.lng) : '')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      await updateCurso(editing.id, form)
    } else {
      await createCurso(form)
    }
    setShowModal(false)
    load()
  }

  const detectLocation = async () => {
    const lat = parseFloat(latInput)
    const lng = parseFloat(lngInput)
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('Ingresá coordenadas válidas (lat: -90 a 90, lng: -180 a 180)')
      return
    }
    setLoadingGeo(true)
    const result = await reverseGeocode(lat, lng)
    setLoadingGeo(false)
    if (!result) {
      alert('No se pudo determinar la ubicación. Intentá con otras coordenadas.')
      return
    }
    // Check if the department is in our list
    const deptMatch = elSalvadorDepartments.find(d => d.toLowerCase() === result.departamento.toLowerCase())
    if (deptMatch) {
      setSelectedDept(deptMatch)
      const munList = municipalitiesByDepartment[deptMatch] ?? []
      const munMatch = munList.find(m => m.toLowerCase() === result.municipio.toLowerCase())
      if (munMatch) {
        setSelectedMun(munMatch)
        setForm(p => ({ ...p, departamento: deptMatch, municipio: munMatch, ubicacion: result.ubicacion, lat, lng }))
      } else {
        setSelectedMun('')
        setForm(p => ({ ...p, departamento: deptMatch, municipio: '', ubicacion: result.ubicacion, lat, lng }))
      }
    } else {
      // Department not recognized — still fill what we can
      setSelectedDept('')
      setSelectedMun('')
      setForm(p => ({ ...p, departamento: '', municipio: '', ubicacion: result.ubicacion, lat, lng }))
      alert(`Departamento "${result.departamento}" no encontrado en la lista de El Salvador. Seleccioná manualmente.`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este curso?')) return
    await deleteCurso(id)
    load()
  }

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm(p => ({ ...p, tags: [...p.tags, tagInput.trim()] }))
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setForm(p => ({ ...p, tags: p.tags.filter(t => t !== tag) }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-ivory">Cursos</h2>
          <p className="text-sm text-warm-gray mt-1">Gestiona los cursos y capacitaciones ACOES</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-gold text-charcoal text-sm font-semibold rounded-xl hover:bg-gold-light transition-colors">
          <Plus className="w-4 h-4" /> Nuevo curso
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-gray" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar cursos..."
          className="w-full pl-11 pr-4 py-3 bg-charcoal-light border border-warm-tan/20 rounded-xl text-sm text-ivory placeholder:text-warm-gray focus:outline-none focus:border-gold/50"
        />
      </div>

      {/* Table */}
      <AnimatedSection className="bg-charcoal-light rounded-xl border border-warm-tan/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-warm-tan/10">
                <th className="text-left px-4 py-3 text-[10px] font-mono tracking-wider uppercase text-warm-gray">Curso</th>
                <th className="text-left px-4 py-3 text-[10px] font-mono tracking-wider uppercase text-warm-gray hidden md:table-cell">Categoría</th>
                <th className="text-left px-4 py-3 text-[10px] font-mono tracking-wider uppercase text-warm-gray hidden lg:table-cell">Facilitador</th>
                <th className="text-left px-4 py-3 text-[10px] font-mono tracking-wider uppercase text-warm-gray">Cupos</th>
                <th className="text-left px-4 py-3 text-[10px] font-mono tracking-wider uppercase text-warm-gray hidden sm:table-cell">Precio</th>
                <th className="text-left px-4 py-3 text-[10px] font-mono tracking-wider uppercase text-warm-gray">Estado</th>
                <th className="text-left px-4 py-3 text-[10px] font-mono tracking-wider uppercase text-warm-gray">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-warm-tan/5"><td colSpan={7} className="px-4 py-4"><div className="h-3 bg-warm-tan/10 rounded animate-pulse" /></td></tr>
                ))
              ) : cursos.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-warm-gray">No hay cursos</td></tr>
              ) : (
                cursos.map(c => (
                  <tr key={c.id} className="border-b border-warm-tan/5 hover:bg-charcoal/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm text-ivory font-medium">{c.nombre}</p>
                      <p className="text-[11px] text-warm-gray">{c.instructor}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-gold">{c.categoria}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-ivory">{resolveFacilitatorName(c.facilitadorId, facilitators) || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${c.cupoMaximo - c.inscritos <= 3 ? 'text-error' : 'text-ivory'}`}>
                        {c.inscritos}/{c.cupoMaximo}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm text-ivory">{c.precio === 0 ? 'Gratis' : `$${c.precio}`}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge estado={c.estado} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-gold/10 text-warm-gray hover:text-gold transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-error/10 text-warm-gray hover:text-error transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AnimatedSection>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-hidden" onClick={() => setShowModal(false)}>
          <div className="bg-charcoal-light rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-warm-tan/20 shadow-glow" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-warm-tan/10 flex-shrink-0">
              <h3 className="font-display text-2xl text-ivory">{editing ? 'Editar curso' : 'Nuevo curso'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-charcoal text-warm-gray hover:text-ivory"><X className="w-5 h-5" /></button>
            </div>

            <form id="curso-form" onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden px-6 py-4 space-y-4">
              <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1">
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Nombre" value={form.nombre} onChange={v => setForm(p => ({ ...p, nombre: v }))} required />
                  <Field label="Categoría" value={form.categoria} onChange={v => setForm(p => ({ ...p, categoria: v }))} select options={['Colorimetría', 'Corte', 'Manicure', 'Maquillaje', 'Tratamientos', 'Barbería', 'Estilismo', 'Spa']} />
                </div>
                <Field label="Facilitador" value={form.facilitadorId || ''} onChange={v => setForm(p => ({ ...p, facilitadorId: v }))} select options={['', ...facilitators.map(f => `${f.id}|${f.name}`)]} />
                <Field label="Descripción" value={form.descripcion} onChange={v => setForm(p => ({ ...p, descripcion: v }))} textarea />
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Nivel" value={form.nivel} onChange={v => setForm(p => ({ ...p, nivel: v }))} select options={['Básico', 'Intermedio', 'Avanzado']} />
                  <Field label="Estado" value={form.estado} onChange={v => setForm(p => ({ ...p, estado: v as Curso['estado'] }))} select options={['abierto', 'lleno', 'en_curso', 'finalizado', 'proximamente']} />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <Field label="Precio ($)" type="number" value={String(form.precio)} onChange={v => setForm(p => ({ ...p, precio: Number(v) }))} />
                  <Field label="Cupo máximo" type="number" value={String(form.cupoMaximo)} onChange={v => setForm(p => ({ ...p, cupoMaximo: Number(v) }))} />
                  <Field label="Horario" value={form.horario} onChange={v => setForm(p => ({ ...p, horario: v }))} />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Fecha inicio" type="date" value={form.fechaInicio} onChange={v => setForm(p => ({ ...p, fechaInicio: v }))} />
                  <Field label="Fecha fin" type="date" value={form.fechaFin} onChange={v => setForm(p => ({ ...p, fechaFin: v }))} />
                </div>
                <Field label="URL imagen" value={form.imagen} onChange={v => setForm(p => ({ ...p, imagen: v }))} placeholder="https://..." />

                {/* Ubicación dinámica */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gold flex-shrink-0" />
                    <span className="text-xs text-warm-gray uppercase tracking-wider">Ubicación</span>
                  </div>

                  {/* Coordenadas + botón detectar */}
                  <div className="grid md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-warm-gray/70">Latitud</label>
                      <input
                        type="number"
                        step="any"
                        value={latInput}
                        onChange={e => setLatInput(e.target.value)}
                        placeholder="ej: 13.6929"
                        className="mt-1 w-full px-3 py-2 bg-charcoal border border-warm-tan/20 rounded-lg text-sm text-ivory placeholder:text-warm-gray/40 focus:outline-none focus:border-gold/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-warm-gray/70">Longitud</label>
                      <input
                        type="number"
                        step="any"
                        value={lngInput}
                        onChange={e => setLngInput(e.target.value)}
                        placeholder="ej: -89.2182"
                        className="mt-1 w-full px-3 py-2 bg-charcoal border border-warm-tan/20 rounded-lg text-sm text-ivory placeholder:text-warm-gray/40 focus:outline-none focus:border-gold/50"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={detectLocation}
                        disabled={loadingGeo}
                        className="w-full py-2 px-3 bg-gold/10 text-gold border border-gold/20 rounded-lg text-sm hover:bg-gold/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                      >
                        {loadingGeo ? <Loader className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                        {loadingGeo ? 'Detectando...' : 'Detectar'}
                      </button>
                    </div>
                  </div>

                  {/* Ubicación fillable */}
                  <Field
                    label="Dirección / Descripción"
                    value={form.ubicacion}
                    onChange={v => setForm(p => ({ ...p, ubicacion: v }))}
                    placeholder="ej: Centro de Capacitación ACOES, San Salvador"
                  />

                  {/* Departamento / Municipio */}
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-warm-gray uppercase tracking-wider">Departamento</label>
                      <select
                        value={selectedDept}
                        onChange={e => { setSelectedDept(e.target.value); setSelectedMun(''); setForm(p => ({ ...p, departamento: e.target.value, municipio: '' })); }}
                        className="mt-1 w-full px-3 py-2 bg-charcoal border border-warm-tan/20 rounded-lg text-sm text-ivory focus:outline-none focus:border-gold/50 appearance-none"
                      >
                        <option value="">Selecciona un departamento</option>
                        {elSalvadorDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-warm-gray uppercase tracking-wider">Municipio</label>
                      <select
                        value={selectedMun}
                        onChange={e => { setSelectedMun(e.target.value); setForm(p => ({ ...p, municipio: e.target.value })); }}
                        className="mt-1 w-full px-3 py-2 bg-charcoal border border-warm-tan/20 rounded-lg text-sm text-ivory focus:outline-none focus:border-gold/50 appearance-none"
                      >
                        <option value="">Selecciona un municipio</option>
                        {(municipalitiesByDepartment[selectedDept] || []).map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Instructor" value={form.instructor} onChange={v => setForm(p => ({ ...p, instructor: v }))} />
                  <Field label="Bio instructor" value={form.instructorBio} onChange={v => setForm(p => ({ ...p, instructorBio: v }))} />
                </div>

                {/* Tags */}
                <div>
                  <label className="text-[10px] text-warm-gray uppercase tracking-wider">Tags</label>
                  <div className="flex gap-2 mt-1.5">
                    <input
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      placeholder="Agregar tag..."
                      className="flex-1 px-4 py-2 bg-charcoal border border-warm-tan/20 rounded-lg text-sm text-ivory placeholder:text-warm-gray focus:outline-none focus:border-gold/50"
                    />
                    <button type="button" onClick={addTag} className="px-4 py-2 bg-gold/10 text-gold rounded-lg hover:bg-gold/20 text-sm">Agregar</button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-charcoal-lighter text-ivory text-xs rounded-md border border-warm-tan/20">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="text-warm-gray hover:text-error"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </form>

            <div className="flex gap-3 px-6 py-4 border-t border-warm-tan/10 flex-shrink-0">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-warm-tan/20 text-warm-gray text-sm rounded-xl hover:border-warm-tan/40">Cancelar</button>
              <button type="submit" form="curso-form" className="flex-1 py-3 bg-gold text-charcoal text-sm font-semibold rounded-xl hover:bg-gold-light">{editing ? 'Guardar cambios' : 'Crear curso'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ estado }: { estado: Curso['estado'] }) {
  const styles: Record<string, string> = {
    abierto: 'bg-success/10 text-success',
    lleno: 'bg-error/10 text-error',
    en_curso: 'bg-gold/10 text-gold',
    finalizado: 'bg-warm-tan/10 text-warm-gray',
    proximamente: 'bg-ivory/10 text-ivory',
  }
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${styles[estado] || ''}`}>{estado.replace('_', ' ')}</span>
}

function Field({ label, value, onChange, type = 'text', textarea, select, options, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; textarea?: boolean; select?: boolean; options?: string[]; placeholder?: string; required?: boolean
}) {
  return (
    <div>
      <label className="text-[10px] text-warm-gray uppercase tracking-wider">{label}{required && ' *'}</label>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} className="mt-1.5 w-full px-4 py-2.5 bg-charcoal border border-warm-tan/20 rounded-lg text-sm text-ivory placeholder:text-warm-gray focus:outline-none focus:border-gold/50 resize-none" />
      ) : select ? (
        <select value={value} onChange={e => onChange(e.target.value)} className="mt-1.5 w-full px-4 py-2.5 bg-charcoal border border-warm-tan/20 rounded-lg text-sm text-ivory focus:outline-none focus:border-gold/50 appearance-none">
          {options?.map(o => {
            const [rawValue, rawLabel] = o.includes('|') ? o.split('|', 2) : [o, o]
            return <option key={rawValue || rawLabel} value={rawValue}>{rawLabel || rawValue || '—'}</option>
          })}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="mt-1.5 w-full px-4 py-2.5 bg-charcoal border border-warm-tan/20 rounded-lg text-sm text-ivory placeholder:text-warm-gray focus:outline-none focus:border-gold/50" />
      )}
    </div>
  )
}
