import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, AlertCircle, Trash2, RotateCcw, X } from 'lucide-react';
import { getParticipants, patchParticipant, deleteParticipant, Participant } from '@/services/api';

const DEPARTMENTS = [
  'San Salvador', 'La Libertad', 'Santa Ana', 'San Miguel', 'La Paz',
  'Cabañas', 'Chalatenango', 'Cuscatlán', 'La Unión', 'Morazán',
  'San Vicente', 'Sonsonate', 'Usulután'
];

const FUNCTIONS = [
  'Participante', 'Facilitadora', 'Coordinadora', 'Voluntaria'
];

interface FormData {
  full_name: string;
  email: string;
  department: string;
  role_function: string;
  notes: string;
}

export default function EditParticipantPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [transitionConfirm, setTransitionConfirm] = useState<'to-inactive' | 'to-active' | null>(null);

  useEffect(() => {
    const fetchParticipant = async () => {
      try {
        const result = await getParticipants({ page: 1, limit: 100 });
        const found = result.data.find(p => p.id === Number(id));
        if (found) {
          setParticipant(found);
          setForm({
            full_name: found.full_name,
            email: found.email || '',
            department: found.department || '',
            role_function: found.role_function,
            notes: found.notes || '',
          });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchParticipant();
  }, [id]);

  const updateField = (field: keyof FormData, value: string) => {
    if (!form) return;
    setForm(prev => ({ ...prev!, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = (): boolean => {
    if (!form) return false;
    const newErrors: Record<string, string> = {};
    if (!form.full_name.trim()) newErrors.full_name = 'El nombre es requerido';
    if (!form.email.trim()) newErrors.email = 'El correo es requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Correo inválido';
    if (!form.department) newErrors.department = 'Selecciona un departamento';
    if (!form.role_function) newErrors.role_function = 'Selecciona una función';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !participant) return;
    setSaving(true);
    setSubmitError(null);
    try {
      await patchParticipant(participant.id, {
        full_name: form!.full_name,
        email: form!.email,
        department: form!.department,
        role_function: form!.role_function,
        notes: form!.notes || null,
      });
      navigate('/admin/participants');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleTransition = async (newState: 'active' | 'inactive') => {
    if (!participant) return;
    setSaving(true);
    setSubmitError(null);
    try {
      await patchParticipant(participant.id, {
        lifecycle_state: newState,
      });
      setParticipant(prev => prev ? { ...prev, lifecycle_state: newState } : null);
      setTransitionConfirm(null);
    } catch (err) {
      if (err instanceof Error && err.message.includes('409')) {
        setSubmitError('No se puede realizar esta transición de estado. El participante puede tener restricciones.');
      } else {
        setSubmitError(err instanceof Error ? err.message : 'Error al cambiar estado');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!participant) return;
    setSaving(true);
    setSubmitError(null);
    try {
      await deleteParticipant(participant.id);
      navigate('/admin/participants');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!participant || !form) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Participante no encontrado</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center gap-4">
          <Link to="/admin/participants" className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <span className="font-mono text-[10px] tracking-wider uppercase text-gold">Administración</span>
            <h1 className="font-display text-2xl text-foreground">Editar Participante</h1>
          </div>
          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
            participant.lifecycle_state === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
          }`}>
            {participant.lifecycle_state === 'active' ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        {/* Basic Info */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-5">
          <h3 className="font-display text-lg text-foreground">Datos básicos</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Nombre completo *</label>
              <input
                type="text"
                value={form.full_name}
                onChange={e => updateField('full_name', e.target.value)}
                className={`mt-1.5 w-full px-4 py-3 bg-background border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/50 transition-all ${errors.full_name ? 'border-red-500/50' : 'border-border'}`}
              />
              {errors.full_name && <p className="mt-1 text-xs text-red-500">{errors.full_name}</p>}
            </div>

            <div className="col-span-2">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Correo electrónico *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => updateField('email', e.target.value)}
                className={`mt-1.5 w-full px-4 py-3 bg-background border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/50 transition-all ${errors.email ? 'border-red-500/50' : 'border-border'}`}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Departamento *</label>
              <select
                value={form.department}
                onChange={e => updateField('department', e.target.value)}
                className={`mt-1.5 w-full px-4 py-3 bg-background border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/50 appearance-none transition-all ${errors.department ? 'border-red-500/50' : 'border-border'}`}
              >
                <option value="">Selecciona</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.department && <p className="mt-1 text-xs text-red-500">{errors.department}</p>}
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Función en ACOES *</label>
              <select
                value={form.role_function}
                onChange={e => updateField('role_function', e.target.value)}
                className={`mt-1.5 w-full px-4 py-3 bg-background border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/50 appearance-none transition-all ${errors.role_function ? 'border-red-500/50' : 'border-border'}`}
              >
                <option value="">Selecciona</option>
                {FUNCTIONS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              {errors.role_function && <p className="mt-1 text-xs text-red-500">{errors.role_function}</p>}
            </div>
          </div>
        </div>

        {/* Observations */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-5">
          <h3 className="font-display text-lg text-foreground">Observaciones</h3>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Notas adicionales</label>
            <textarea
              value={form.notes}
              onChange={e => updateField('notes', e.target.value)}
              className="mt-1.5 w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/50 resize-none h-24 transition-all"
            />
          </div>
        </div>

        {/* Error */}
        {submitError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-500">{submitError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {participant.lifecycle_state === 'active' ? (
              <button
                onClick={() => setTransitionConfirm('to-inactive')}
                className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
                Desactivar
              </button>
            ) : (
              <>
                <Link
                  to={`/admin/participants/${id}/restore`}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restaurar
                </Link>
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin/participants"
              className="px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-gold text-charcoal text-sm font-semibold rounded-xl hover:bg-gold-light transition-all disabled:opacity-50"
            >
              {saving ? 'Guardando...' : (
                <>
                  <Check className="w-4 h-4" />
                  Guardar cambios
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Transition Confirmation Modal */}
      {transitionConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setTransitionConfirm(null)}>
          <div className="bg-card rounded-2xl max-w-md w-full p-6 border border-border shadow-glow" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="font-display text-xl text-foreground">Confirmar transición</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              ¿Estás seguro de que deseas {transitionConfirm === 'to-inactive' ? 'desactivar' : 'activar'} este participante?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setTransitionConfirm(null)}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleTransition(transitionConfirm === 'to-inactive' ? 'inactive' : 'active')}
                disabled={saving}
                className="px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {saving ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(false)}>
          <div className="bg-card rounded-2xl max-w-md w-full p-6 border border-border shadow-glow" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="font-display text-xl text-foreground">Confirmar eliminación</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              ¿Estás seguro de que deseas eliminar este participante? Esta acción lo marcar\u00e1 como inactivo y no podr\u00e1 ser utilizado.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {saving ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
