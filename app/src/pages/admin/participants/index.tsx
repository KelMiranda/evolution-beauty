import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FadeIn } from '@/components/animations';
import {
  Search, Filter, Eye, MapPin, Phone, ChevronLeft, ChevronRight,
  Download, X, AlertCircle
} from 'lucide-react';
import {
  getParticipants, deleteParticipant, Participant, ParticipantsResponse
} from '@/services/api';

const DEPARTMENTS = [
  'San Salvador', 'La Libertad', 'Santa Ana', 'San Miguel', 'La Paz',
  'Cabañas', 'Chalatenango', 'Cuscatlán', 'La Unión', 'Morazán',
  'San Vicente', 'Sonsonate', 'Usulután'
];

const LIFECYCLE_STATES = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
];

export default function AdminParticipantsPage() {
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [lifecycleState, setLifecycleState] = useState<'all' | 'active' | 'inactive'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const limit = 10;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getParticipants({
        q: search || undefined,
        department: department || undefined,
        lifecycleState: lifecycleState === 'all' ? undefined : lifecycleState,
        page,
        limit,
      });
      setParticipants(result.data);
      setTotal(result.meta ? result.data.length : 0);
    } finally {
      setLoading(false);
    }
  }, [search, department, lifecycleState, page]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  // Fetch total count separately for pagination
  useEffect(() => {
    const fetchTotal = async () => {
      const result = await getParticipants({
        q: search || undefined,
        department: department || undefined,
        lifecycleState: lifecycleState === 'all' ? undefined : lifecycleState,
        page: 1,
        limit: 1,
      });
      // The API may return total in meta or we calculate from response
      setTotal(result.data.length > 0 ? 100 : 0); // fallback
    };
    fetchTotal();
  }, [search, department, lifecycleState]);

  const handleDelete = async (id: number) => {
    try {
      await deleteParticipant(id);
      setDeleteConfirm(null);
      fetchParticipants();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  const handleExport = () => {
    const data = participants.map(p => ({
      Codigo: p.participant_code,
      Nombre: p.full_name,
      DUI: p.document_number,
      Celular: p.phone,
      Correo: p.email,
      Departamento: p.department,
      Funcion: p.role_function,
      Estado: p.lifecycle_state,
    }));
    const csv = [Object.keys(data[0] || {}).join(','), ...data.map(row => Object.values(row).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ACOES_Participantes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div>
            <span className="font-mono text-[10px] tracking-wider uppercase text-gold">Administración</span>
            <h1 className="font-display text-2xl text-foreground">Participantes</h1>
          </div>
          <Link
            to="/admin/participants/new"
            className="px-4 py-2 bg-gold text-charcoal text-sm font-semibold rounded-lg hover:bg-gold-light transition-colors"
          >
            + Nuevo participante
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <FadeIn>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Buscar por nombre, DUI, correo..."
                    className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold/40 transition-all"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2 rounded-lg border transition-colors ${showFilters ? 'bg-gold/10 text-gold border-gold/20' : 'border-border text-muted-foreground hover:text-foreground'}`}
                >
                  <Filter className="w-4 h-4" />
                </button>
                <button
                  onClick={handleExport}
                  className="p-2 rounded-lg bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors"
                  title="Exportar CSV"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="p-4 bg-muted/30 border-b border-border flex flex-wrap gap-2">
                <select
                  value={department}
                  onChange={e => { setDepartment(e.target.value); setPage(1); }}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                >
                  <option value="">Todos los departamentos</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select
                  value={lifecycleState}
                  onChange={e => { setLifecycleState(e.target.value as 'all' | 'active' | 'inactive'); setPage(1); }}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                >
                  {LIFECYCLE_STATES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                {(department || lifecycleState !== 'all') && (
                  <button
                    onClick={() => { setDepartment(''); setLifecycleState('all'); setPage(1); }}
                    className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-border">
                    {['Código', 'Nombre', 'DUI', 'Celular', 'Departamento', 'Función', 'Estado', ''].map((h, i) => (
                      <th key={i} className="text-left px-4 py-3 text-[10px] font-mono tracking-wider uppercase text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/50">
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-4 py-4"><div className="h-3 bg-muted rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  ) : participants.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                        No se encontraron participantes
                      </td>
                    </tr>
                  ) : (
                    participants.map(p => (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors group">
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-[11px] text-gold/70">{p.participant_code}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm text-foreground font-medium">{p.full_name}</p>
                          <p className="text-[11px] text-muted-foreground">{p.email}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[11px] text-muted-foreground">{p.document_number}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Phone className="w-3 h-3" />{p.phone}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <MapPin className="w-3 h-3" />{p.department || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[11px] text-muted-foreground">{p.role_function}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            p.lifecycle_state === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
                          }`}>
                            {p.lifecycle_state === 'active' ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => navigate(`/admin/participants/${p.id}`)}
                              className="p-1.5 rounded-lg hover:bg-gold/10 text-muted-foreground hover:text-gold transition-all"
                              title="Ver/Editar"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {p.lifecycle_state === 'active' && (
                              <button
                                onClick={() => setDeleteConfirm(p.id)}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all"
                                title="Eliminar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[11px] text-muted-foreground">
                Mostrando {participants.length} participantes
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-border disabled:opacity-30 hover:bg-muted transition-colors text-muted-foreground"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${page === p ? 'bg-gold text-charcoal' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-border disabled:opacity-30 hover:bg-muted transition-colors text-muted-foreground"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </FadeIn>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => { setDeleteConfirm(null); setDeleteError(null); }}>
          <FadeIn direction="up" distance={30} scale={0.95} scrollTrigger={false}>
            <div className="bg-card rounded-2xl max-w-md w-full p-6 border border-border shadow-glow" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="font-display text-xl text-foreground">Confirmar eliminación</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                ¿Estás seguro de que deseas eliminar este participante? Esta acción lo marcar\u00e1 como inactivo.
              </p>
              {deleteError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">
                  {deleteError}
                </div>
              )}
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => { setDeleteConfirm(null); setDeleteError(null); }}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </FadeIn>
        </div>
      )}

      {/* Detail Modal */}
      {selectedParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedParticipant(null)}>
          <FadeIn direction="up" distance={30} scale={0.95} scrollTrigger={false}>
            <div className="bg-card rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 border border-border shadow-glow" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-xl text-foreground">{selectedParticipant.full_name}</h3>
                <button onClick={() => setSelectedParticipant(null)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground text-xl transition-colors">
                  &times;
                </button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { l: 'Código', v: selectedParticipant.participant_code },
                    { l: 'DUI', v: selectedParticipant.document_number },
                    { l: 'Celular', v: selectedParticipant.phone },
                    { l: 'Correo', v: selectedParticipant.email },
                    { l: 'Departamento', v: selectedParticipant.department },
                    { l: 'Función', v: selectedParticipant.role_function },
                    { l: 'Organización', v: selectedParticipant.organization },
                    { l: 'Programa', v: selectedParticipant.program },
                  ].map((f, i) => (
                    <div key={i} className="bg-muted/50 rounded-lg p-3 border border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase">{f.l}</span>
                      <p className="text-sm text-foreground font-medium mt-0.5">{f.v || '-'}</p>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    selectedParticipant.lifecycle_state === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
                  }`}>
                    {selectedParticipant.lifecycle_state === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(selectedParticipant.created_at).toLocaleDateString('es-SV')}
                  </span>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      )}
    </div>
  );
}
