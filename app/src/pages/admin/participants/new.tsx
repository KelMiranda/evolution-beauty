import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, AlertCircle } from 'lucide-react';
import { createParticipant } from '@/services/api';

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

const initialForm: FormData = {
  full_name: '',
  email: '',
  department: '',
  role_function: '',
  notes: '',
};

export default function NewParticipantPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateField = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.full_name.trim()) newErrors.full_name = 'El nombre es requerido';
    if (!form.email.trim()) newErrors.email = 'El correo es requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Correo inválido';
    if (!form.department) newErrors.department = 'Selecciona un departamento';
    if (!form.role_function) newErrors.role_function = 'Selecciona una función';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setSubmitError(null);
    try {
      await createParticipant({
        full_name: form.full_name,
        email: form.email,
        department: form.department,
        role_function: form.role_function,
        notes: form.notes || null,
        document_number: '',
        phone_country: '+503',
        phone_dial_code: '',
        phone_number: '',
        phone: '',
        address: null,
        municipality: null,
        district: null,
        organization: null,
        education_level: null,
        program: null,
        status: 'activo',
        consent: false,
      });
      navigate('/admin/participants');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al crear participante');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center gap-4">
          <Link to="/admin/participants" className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <span className="font-mono text-[10px] tracking-wider uppercase text-gold">Administración</span>
            <h1 className="font-display text-2xl text-foreground">Nuevo Participante</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-card rounded-xl border border-border p-6 space-y-5">
            <h3 className="font-display text-lg text-foreground">Datos básicos</h3>

            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Nombre completo *</label>
              <input
                type="text"
                value={form.full_name}
                onChange={e => updateField('full_name', e.target.value)}
                placeholder="Nombre del participante"
                className={`mt-1.5 w-full px-4 py-3 bg-background border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/50 transition-all ${errors.full_name ? 'border-red-500/50' : 'border-border'}`}
              />
              {errors.full_name && <p className="mt-1 text-xs text-red-500">{errors.full_name}</p>}
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Correo electrónico *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => updateField('email', e.target.value)}
                placeholder="correo@ejemplo.com"
                className={`mt-1.5 w-full px-4 py-3 bg-background border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/50 transition-all ${errors.email ? 'border-red-500/50' : 'border-border'}`}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                placeholder="Notas u observaciones sobre el participante"
                className="mt-1.5 w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/50 resize-none h-24 transition-all"
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
          <div className="flex items-center justify-end gap-3">
            <Link
              to="/admin/participants"
              className="px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-gold text-charcoal text-sm font-semibold rounded-xl hover:bg-gold-light transition-all disabled:opacity-50"
            >
              {loading ? (
                'Guardando...'
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Guardar participante
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
