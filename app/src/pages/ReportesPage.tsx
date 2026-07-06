import { AnimatedSection } from '@/components/AnimatedSection'
import { useDashboard } from '@/hooks/useDashboard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { MapPin, Users, GraduationCap, BarChart3 } from 'lucide-react'

const COLORS = ['#C9A84C', '#8B7355', '#6B5A44', '#A08B6D', '#D4B86A', '#5C4A3A', '#E8D5B5']

export function ReportesPage() {
  const { stats, loading } = useDashboard()

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-8">
      <AnimatedSection>
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-gold" />
          <div>
            <h2 className="font-display text-2xl text-ivory">Reportes</h2>
            <p className="text-sm text-warm-gray mt-0.5">Análisis detallado de los registros ACOES</p>
          </div>
        </div>
      </AnimatedSection>

      <div className="grid lg:grid-cols-2 gap-6">
        <AnimatedSection className="bg-charcoal-light rounded-xl p-6 border border-warm-tan/10">
          <div className="flex items-center gap-3 mb-6">
            <MapPin className="w-5 h-5 text-gold" />
            <h3 className="font-display text-lg text-ivory">Por departamento</h3>
          </div>
          <div className="overflow-x-auto">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.porDepartamento || []} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3A3530" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#6B6560' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#FAF8F5' }} axisLine={false} tickLine={false} width={100} />
                <Tooltip contentStyle={{ backgroundColor: '#23201E', border: '1px solid #3A3530', borderRadius: '8px', color: '#FAF8F5' }} />
                <Bar dataKey="value" fill="#C9A84C" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.1} className="bg-charcoal-light rounded-xl p-6 border border-warm-tan/10">
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-5 h-5 text-gold" />
            <h3 className="font-display text-lg text-ivory">Distribución por género</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={stats?.porGenero || []} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {(stats?.porGenero || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#23201E', border: '1px solid #3A3530', borderRadius: '8px', color: '#FAF8F5' }} />
            </PieChart>
          </ResponsiveContainer>
        </AnimatedSection>

        <AnimatedSection delay={0.2} className="lg:col-span-2 bg-charcoal-light rounded-xl p-6 border border-warm-tan/10">
          <div className="flex items-center gap-3 mb-6">
            <GraduationCap className="w-5 h-5 text-gold" />
            <h3 className="font-display text-lg text-ivory">Tendencia mensual</h3>
          </div>
          <div className="overflow-x-auto">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats?.porMes || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3A3530" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#6B6560' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#6B6560' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#23201E', border: '1px solid #3A3530', borderRadius: '8px', color: '#FAF8F5' }} cursor={{ fill: 'rgba(201,168,76,0.05)' }} />
                <Bar dataKey="cantidad" fill="#C9A84C" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnimatedSection>
      </div>
    </div>
  )
}
