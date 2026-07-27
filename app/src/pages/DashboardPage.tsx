import { useEffect, useState } from 'react'
import { useDashboard } from '@/hooks/useDashboard'
import { useRegistros } from '@/hooks/useRegistros'
import { useUsers } from '@/hooks/useUsers'
import { createCoursePublicLink, downloadParticipantsXlsx, getCourseRecords } from '@/services/api'
import { FadeIn, CountUp } from '@/components/animations'
import { splitFacilitadores } from '@/utils/facilitadores'
import { EQUIPO_POLICIES, EQUIPO_ROLE_LABEL } from '@/utils/equipo'
import {
  Users, GraduationCap, TrendingUp, BookOpen,
  Search, Download, ChevronLeft, ChevronRight,
  Filter, Eye, MapPin, Phone, Link as LinkIcon, Copy, RefreshCw, BadgeCheck,
  UserPlus
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#C9A84C', '#8B7355', '#6B5A44', '#A08B6D']

export function DashboardPage() {
  const { stats } = useDashboard()
  const { users: equipoUsers, loading: equipoLoading } = useUsers()
  const [courses, setCourses] = useState<Awaited<ReturnType<typeof getCourseRecords>>>([])
  const [links, setLinks] = useState<Record<string, { token: string; publicUrl: string }>>({})
  const [linkLoadingId, setLinkLoadingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ departamento: '', funcion: '', estado: '' })
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedRegistro, setSelectedRegistro] = useState<string | null>(null)

  const { registros, total, loading } = useRegistros({
    search: search || undefined,
    departamento: filters.departamento || undefined,
    funcion: filters.funcion || undefined,
    estado: filters.estado || undefined,
    page,
    limit: 10,
  })

  const totalPages = Math.max(1, Math.ceil(total / 10))
  const selectedData = registros.find(r => r.id === selectedRegistro)

  /**
   * Facilitador split for the dashboard panel — both buckets are filtered
   * from `registros` via the pure `splitFacilitadores` helper (see
   * `app/src/utils/facilitadores.ts` for the canonical role filter and
   * `courseId` truthiness semantics).
   */
  const { linked: facilitatorsLinked, unlinked: facilitatorsUnlinked } = splitFacilitadores(registros)

  /** Map of `courseId -> course name` for joining facilitator rows to course titles. */
  const courseNameById = new Map(courses.map(c => [String(c.id), c.name] as const))

  useEffect(() => {
    getCourseRecords({ includeHidden: true }).then(setCourses).catch(() => setCourses([]))
  }, [])

  const handleExport = () => {
    downloadParticipantsXlsx({ search: search || undefined, departamento: filters.departamento || undefined, estado: filters.estado || undefined, page, limit: 10 })
  }

  const ensureLink = async (courseId: string) => {
    setLinkLoadingId(courseId)
    try {
      const link = await createCoursePublicLink(courseId)
      setLinks(prev => ({ ...prev, [courseId]: link }))
      return link
    } finally {
      setLinkLoadingId(null)
    }
  }

  const handleCopyLink = async (courseId: string) => {
    const link = links[courseId] ?? await ensureLink(courseId)
    await navigator.clipboard.writeText(link.publicUrl)
    setCopiedId(courseId)
    window.setTimeout(() => setCopiedId(current => current === courseId ? null : current), 1800)
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Registrados', value: stats?.totalRegistros || 0 },
          { icon: TrendingUp, label: 'Esta semana', value: stats?.registrosSemana || 0 },
          { icon: GraduationCap, label: 'Facilitadores', value: stats?.facilitadores || 0 },
          { icon: BookOpen, label: 'Cursos activos', value: stats?.cursosActivos || 0 },
        ].map((stat, i) => (
          <FadeIn key={i} delay={i * 0.08} direction="up" distance={20}>
            <div className="group bg-charcoal-light rounded-xl p-5 border border-warm-tan/[0.08] hover:border-gold/15 transition-all duration-300 hover:-translate-y-0.5">
              <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center mb-3 group-hover:bg-gold/15 transition-colors">
                <stat.icon className="w-4 h-4 text-gold" />
              </div>
              <p className="text-2xl font-display text-ivory">
                <CountUp end={stat.value} duration={1.5} delay={0.2 + i * 0.1} />
              </p>
              <p className="text-[11px] text-warm-gray/60 mt-0.5">{stat.label}</p>
            </div>
          </FadeIn>
        ))}
      </div>

      {/* Course links panel */}
      <FadeIn delay={0.08}>
        <div className="bg-charcoal-light rounded-xl border border-warm-tan/[0.08] overflow-hidden">
          <div className="p-4 lg:p-5 border-b border-warm-tan/[0.08] flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg text-ivory">Enlaces públicos de cursos</h3>
              <p className="text-[11px] text-warm-gray/50 mt-1">Cursos activos, facilitador asignado, cupo y link de inscripción.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/15 bg-gold/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-gold">
              <BadgeCheck className="w-3.5 h-3.5" />
              Admin / permiso
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-warm-tan/[0.08]">
                  <th className="text-left px-4 py-3 text-[10px] font-mono tracking-wider uppercase text-warm-gray/50">Curso</th>
                  <th className="text-left px-4 py-3 text-[10px] font-mono tracking-wider uppercase text-warm-gray/50">Facilitador</th>
                  <th className="text-left px-4 py-3 text-[10px] font-mono tracking-wider uppercase text-warm-gray/50">Estado</th>
                  <th className="text-left px-4 py-3 text-[10px] font-mono tracking-wider uppercase text-warm-gray/50">Cupos</th>
                  <th className="text-left px-4 py-3 text-[10px] font-mono tracking-wider uppercase text-warm-gray/50">Token / link</th>
                  <th className="text-left px-4 py-3 text-[10px] font-mono tracking-wider uppercase text-warm-gray/50">Acción</th>
                </tr>
              </thead>
              <tbody>
                {courses.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-warm-gray/40">No hay cursos publicados para gestión de enlaces</td></tr>
                ) : courses.map(course => {
                  const courseId = String(course.id)
                  const link = links[courseId]
                  const statusClass = course.estado === 'full' ? 'bg-error/10 text-error' : course.estado === 'completed' ? 'bg-warm-tan/10 text-warm-gray' : course.estado === 'in_progress' ? 'bg-gold/10 text-gold' : course.estado === 'enrolling' ? 'bg-success/10 text-success' : 'bg-ivory/10 text-ivory'

                  return (
                    <tr key={courseId} className="border-b border-warm-tan/[0.03] hover:bg-charcoal/30 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="text-sm text-ivory font-medium">{course.name}</p>
                        <p className="text-[11px] text-warm-gray/50">{course.category}</p>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-ivory/80">{course.instructor}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${statusClass}`}>{course.estado}</span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-ivory/80">
                        {course.inscritos}/{course.cupo_maximo}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-[11px] text-warm-gray/60">
                            <LinkIcon className="w-3.5 h-3.5 text-gold" />
                            <span className="font-mono">{link?.token ?? course.id}</span>
                          </div>
                          <p className="text-[10px] text-warm-gray/40 truncate max-w-[340px]">{link?.publicUrl ?? 'Genera el link para copiarlo'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <button onClick={() => ensureLink(courseId)} disabled={linkLoadingId === courseId} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-warm-tan/15 text-xs text-ivory hover:border-gold/25 hover:text-gold transition-colors disabled:opacity-50">
                            <RefreshCw className={`w-3.5 h-3.5 ${linkLoadingId === courseId ? 'animate-spin' : ''}`} />
                            Token
                          </button>
                          <button onClick={() => handleCopyLink(courseId)} disabled={linkLoadingId === courseId} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gold/10 border border-gold/20 text-xs text-gold hover:bg-gold/20 transition-colors disabled:opacity-50">
                            <Copy className="w-3.5 h-3.5" />
                            {copiedId === courseId ? 'Copiado' : 'Copiar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </FadeIn>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <FadeIn className="lg:col-span-2" delay={0.1}>
          <div className="bg-charcoal-light rounded-xl p-5 border border-warm-tan/[0.08]">
            <h3 className="font-display text-lg text-ivory mb-4">Registros por mes</h3>
            <div className="overflow-x-auto">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats?.porMes || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3A3530" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6B6560' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B6560' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#23201E', border: '1px solid #3A3530', borderRadius: '8px', color: '#FAF8F5' }} cursor={{ fill: 'rgba(201,168,76,0.05)' }} />
                  <Bar dataKey="cantidad" fill="#C9A84C" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="bg-charcoal-light rounded-xl p-5 border border-warm-tan/[0.08]">
            <h3 className="font-display text-lg text-ivory mb-4">Por género</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats?.porGenero || []} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                  {(stats?.porGenero || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#23201E', border: '1px solid #3A3530', borderRadius: '8px', color: '#FAF8F5' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={6} formatter={(value: string) => <span className="text-[11px] text-warm-gray">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </FadeIn>
      </div>

      {/* Facilitadores — split into linked vs unlinked to a course */}
      <FadeIn delay={0.12}>
        <div className="bg-charcoal-light rounded-xl border border-warm-tan/[0.08] overflow-hidden">
          <div className="p-4 lg:p-5 border-b border-warm-tan/[0.08] flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg text-ivory">Facilitadores</h3>
              <p className="text-[11px] text-warm-gray/50 mt-1">
                Facilitadores vinculados a un curso y pendientes de asignación.
                Derivado de los registros con <span className="text-warm-gray/70">funcion = Facilitador</span>.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 border border-gold/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-gold">
                Vinculados · {facilitatorsLinked.length}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warm-tan/10 border border-warm-tan/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-warm-gray">
                Sin curso · {facilitatorsUnlinked.length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border-b border-warm-tan/[0.06]">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b border-warm-tan/[0.08]">
                  {['Código', 'Nombre', 'Curso', 'Estado', 'Contacto'].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 text-[10px] font-mono tracking-wider uppercase text-warm-gray/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {facilitatorsLinked.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-warm-gray/40 text-[11px]">No hay facilitadores vinculados a un curso todavía.</td></tr>
                ) : facilitatorsLinked.map(r => (
                  <tr key={r.id} className="border-b border-warm-tan/[0.03] hover:bg-charcoal/30 transition-colors">
                    <td className="px-4 py-3.5"><span className="font-mono text-[11px] text-gold/70">{r.codigo}</span></td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-ivory font-medium">{r.nombre}</p>
                      <p className="text-[11px] text-warm-gray/50">{r.dui}</p>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-ivory/80">
                      {(r.courseId && courseNameById.get(r.courseId)) || <span className="text-warm-gray/40 text-[11px]">Curso no encontrado</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${r.estado === 'activo' ? 'bg-success/10 text-success' : r.estado === 'pendiente' ? 'bg-gold/10 text-gold' : 'bg-warm-tan/10 text-warm-gray'}`}>{r.estado}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[11px] text-warm-gray/50"><Phone className="w-3 h-3" />{r.prefijo} {r.celular}</div>
                        <div className="text-[11px] text-warm-gray/40">{r.correo}</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto">
            <div className="px-4 lg:px-5 py-3 border-b border-warm-tan/[0.06] flex items-center justify-between gap-3">
              <p className="text-[11px] text-warm-gray/60">Facilitadores sin curso</p>
              <p className="text-[10px] text-warm-gray/40">Acción de asignación disponible — sin efecto todavía.</p>
            </div>
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b border-warm-tan/[0.08]">
                  {['Código', 'Nombre', 'Estado', 'Contacto', 'Acción'].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 text-[10px] font-mono tracking-wider uppercase text-warm-gray/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {facilitatorsUnlinked.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-warm-gray/40 text-[11px]">No hay facilitadores pendientes de asignación.</td></tr>
                ) : facilitatorsUnlinked.map(r => (
                  <tr key={r.id} className="border-b border-warm-tan/[0.03] hover:bg-charcoal/30 transition-colors">
                    <td className="px-4 py-3.5"><span className="font-mono text-[11px] text-gold/70">{r.codigo}</span></td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-ivory font-medium">{r.nombre}</p>
                      <p className="text-[11px] text-warm-gray/50">{r.dui}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${r.estado === 'activo' ? 'bg-success/10 text-success' : r.estado === 'pendiente' ? 'bg-gold/10 text-gold' : 'bg-warm-tan/10 text-warm-gray'}`}>{r.estado}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[11px] text-warm-gray/50"><Phone className="w-3 h-3" />{r.prefijo} {r.celular}</div>
                        <div className="text-[11px] text-warm-gray/40">{r.correo}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        disabled
                        title="Próximamente: asignación de curso desde aquí"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-warm-tan/15 text-xs text-ivory/70 hover:border-gold/25 hover:text-gold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Asignar curso
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </FadeIn>

      {/* Equipo — admin + empleado users with policy descriptions */}
      <FadeIn delay={0.13}>
        <div className="bg-charcoal-light rounded-xl border border-warm-tan/[0.08] overflow-hidden">
          <div className="p-4 lg:p-5 border-b border-warm-tan/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg text-ivory">Equipo</h3>
              <p className="text-[11px] text-warm-gray/50 mt-1">
                Usuarios internos (administradores y empleados) y el alcance de sus permisos en el sistema.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/15 bg-gold/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-gold">
              <BadgeCheck className="w-3.5 h-3.5" />
              {equipoUsers.length} {equipoUsers.length === 1 ? 'miembro' : 'miembros'}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-warm-tan/[0.08]">
                  {['Correo', 'Nombre', 'Rol', 'Estado', 'Permisos'].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 text-[10px] font-mono tracking-wider uppercase text-warm-gray/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {equipoLoading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <tr key={i} className="border-b border-warm-tan/[0.03]">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-4"><div className="h-3 bg-warm-tan/10 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : equipoUsers.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-warm-gray/40">No hay miembros del equipo todavía.</td></tr>
                ) : equipoUsers.map(user => (
                  <tr key={user.id} className="border-b border-warm-tan/[0.03] hover:bg-charcoal/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-ivory font-medium font-mono">{user.email}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-ivory">{user.fullName}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${user.role === 'admin' ? 'bg-gold/10 text-gold' : 'bg-warm-tan/10 text-warm-gray'}`}>
                        {EQUIPO_ROLE_LABEL[user.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${user.active ? 'bg-success/10 text-success' : 'bg-warm-tan/10 text-warm-gray'}`}>
                        {user.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-[11px] text-warm-gray/60 leading-relaxed max-w-md">
                        {EQUIPO_POLICIES[user.role]}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </FadeIn>

      {/* Table */}
      <FadeIn delay={0.15}>
        <div className="bg-charcoal-light rounded-xl border border-warm-tan/[0.08] overflow-hidden">
          <div className="p-4 lg:p-5 border-b border-warm-tan/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-display text-lg text-ivory">Registros</h3>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-gray/40" />
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar..." className="w-full pl-9 pr-3 py-2 bg-charcoal border border-warm-tan/15 rounded-lg text-sm text-ivory placeholder:text-warm-gray/40 focus:outline-none focus:border-gold/40 transition-all" />
              </div>
              <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-lg border transition-colors ${showFilters ? 'bg-gold/10 text-gold border-gold/20' : 'border-warm-tan/15 text-warm-gray hover:text-ivory'}`}>
                <Filter className="w-4 h-4" />
              </button>
              <button onClick={handleExport} className="p-2 rounded-lg bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors" title="Exportar a Excel">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="px-4 lg:px-5 py-3 bg-charcoal/40 border-b border-warm-tan/[0.08] flex flex-wrap gap-2">
              <select value={filters.departamento} onChange={e => { setFilters(p => ({ ...p, departamento: e.target.value })); setPage(1) }} className="px-3 py-2 bg-charcoal border border-warm-tan/15 rounded-lg text-sm text-ivory">
                <option value="">Todos los departamentos</option>
                {['San Salvador', 'La Libertad', 'Santa Ana', 'San Miguel', 'La Paz'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={filters.funcion} onChange={e => { setFilters(p => ({ ...p, funcion: e.target.value })); setPage(1) }} className="px-3 py-2 bg-charcoal border border-warm-tan/15 rounded-lg text-sm text-ivory">
                <option value="">Todas las funciones</option>
                {['Empleado', 'Facilitador', 'Participante'].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-warm-tan/[0.08]">
                  {['Código', 'Nombre', 'Contacto', 'Depto.', 'Función', 'Estado', ''].map((h, i) => (
                    <th key={i} className={`text-left px-4 py-3 text-[10px] font-mono tracking-wider uppercase text-warm-gray/50 ${i === 2 ? 'hidden lg:table-cell' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-warm-tan/[0.03]">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-4"><div className="h-3 bg-warm-tan/10 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : registros.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-warm-gray/40">No se encontraron registros</td></tr>
                ) : (
                  registros.map(r => (
                    <tr key={r.id} className="border-b border-warm-tan/[0.03] hover:bg-charcoal/30 transition-colors group">
                      <td className="px-4 py-3.5"><span className="font-mono text-[11px] text-gold/70">{r.codigo}</span></td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm text-ivory font-medium">{r.nombre}</p>
                        <p className="text-[11px] text-warm-gray/50">{r.dui}</p>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <div className="flex items-center gap-1 text-[11px] text-warm-gray/50"><Phone className="w-3 h-3" />{r.celular}</div>
                      </td>
                      <td className="px-4 py-3.5"><span className="flex items-center gap-1 text-[11px] text-warm-gray/50"><MapPin className="w-3 h-3" />{r.departamento}</span></td>
                      <td className="px-4 py-3.5"><span className="text-[11px] text-ivory/60">{r.funcion}</span></td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${r.estado === 'activo' ? 'bg-success/10 text-success' : r.estado === 'pendiente' ? 'bg-gold/10 text-gold' : 'bg-warm-tan/10 text-warm-gray'}`}>{r.estado}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <button onClick={() => setSelectedRegistro(r.id)} className="p-1.5 rounded-lg hover:bg-gold/10 text-warm-gray/40 group-hover:text-gold transition-all">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 lg:px-5 py-3 border-t border-warm-tan/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-warm-gray/40">Mostrando {registros.length} de {total} registros</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-warm-tan/15 disabled:opacity-30 hover:bg-charcoal transition-colors text-warm-gray">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${page === p ? 'bg-gold text-charcoal' : 'text-warm-gray hover:bg-charcoal'}`}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg border border-warm-tan/15 disabled:opacity-30 hover:bg-charcoal transition-colors text-warm-gray">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Detail Modal */}
      {selectedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedRegistro(null)}>
          <FadeIn direction="up" distance={30} scale={0.95} scrollTrigger={false}>
            <div className="bg-charcoal-light rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 border border-warm-tan/15 shadow-glow" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-xl text-ivory">{selectedData.nombre}</h3>
                <button onClick={() => setSelectedRegistro(null)} className="p-1.5 rounded-lg hover:bg-charcoal text-warm-gray hover:text-ivory text-xl transition-colors">&times;</button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[{ l: 'Código', v: selectedData.codigo }, { l: 'DUI', v: selectedData.dui }, { l: 'Celular', v: `${selectedData.prefijo} ${selectedData.celular}` }, { l: 'Correo', v: selectedData.correo }, { l: 'Departamento', v: selectedData.departamento }, { l: 'Función', v: selectedData.funcion }, { l: 'Entidad', v: selectedData.entidad }, { l: 'Capacitación', v: selectedData.capacitacion }].map((f, i) => (
                    <div key={i} className="bg-charcoal/50 rounded-lg p-3 border border-warm-tan/[0.05]">
                      <span className="text-[10px] text-warm-gray/50 uppercase">{f.l}</span>
                      <p className="text-sm text-ivory font-medium mt-0.5">{f.v || '-'}</p>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t border-warm-tan/[0.08] flex items-center justify-between">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${selectedData.estado === 'activo' ? 'bg-success/10 text-success' : selectedData.estado === 'pendiente' ? 'bg-gold/10 text-gold' : 'bg-warm-tan/10 text-warm-gray'}`}>{selectedData.estado}</span>
                  <span className="text-[11px] text-warm-gray/40">{selectedData.fechaRegistro}</span>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      )}
    </div>
  )
}
