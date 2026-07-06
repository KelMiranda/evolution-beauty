import { useState } from 'react'
import { useDashboard } from '@/hooks/useDashboard'
import { useRegistros } from '@/hooks/useRegistros'
import { FadeIn, CountUp } from '@/components/animations'
import {
  Users, GraduationCap, TrendingUp, BookOpen,
  Search, Download, ChevronLeft, ChevronRight,
  Filter, Eye, MapPin, Phone
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#C9A84C', '#8B7355', '#6B5A44', '#A08B6D']

export function DashboardPage() {
  const { stats } = useDashboard()
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

  const handleExport = () => {
    const data = registros.map(r => ({ Codigo: r.codigo, Nombre: r.nombre, DUI: r.dui, Celular: r.celular, Correo: r.correo, Departamento: r.departamento, Funcion: r.funcion, Fecha: r.fechaRegistro, Estado: r.estado }))
    const csv = [Object.keys(data[0]).join(','), ...data.map(row => Object.values(row).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ACOES_Registros_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Registrados', value: stats?.totalRegistros || 0 },
          { icon: TrendingUp, label: 'Esta semana', value: stats?.registrosSemana || 0 },
          { icon: GraduationCap, label: 'Facilitadoras', value: stats?.facilitadoras || 0 },
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
              <button onClick={handleExport} className="p-2 rounded-lg bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors">
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
                {['Empleado', 'Facilitadora', 'Participante'].map(f => <option key={f} value={f}>{f}</option>)}
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
