import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createParticipant } from '@/services/api';

export default function RegistroPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    documentNumber: '',
    birthDate: '',
    gender: '',
    phoneCountry: 'CR',
    phoneDialCode: '+506',
    phoneNumber: '',
    email: '',
    department: '',
    roleFunction: '',
    notes: '',
    consent: false,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.fullName || !formData.documentNumber || !formData.email || !formData.consent) {
      setError('Por favor completa los campos requeridos');
      setLoading(false);
      return;
    }

    try {
      const fullPhone = `${formData.phoneDialCode} ${formData.phoneNumber}`;
      await createParticipant({
        fullName: formData.fullName,
        documentNumber: formData.documentNumber,
        birthDate: formData.birthDate,
        gender: formData.gender,
        phoneCountry: formData.phoneCountry,
        phoneDialCode: formData.phoneDialCode,
        phoneNumber: formData.phoneNumber,
        phone: fullPhone,
        email: formData.email,
        department: formData.department,
        roleFunction: formData.roleFunction,
        notes: formData.notes,
        consent: formData.consent,
        status: 'Activo',
      });
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md text-center">
          <div className="text-success mb-4 text-6xl">✓</div>
          <h1 className="font-display text-3xl text-foreground">¡Registro Exitoso!</h1>
          <p className="mt-2 text-muted-foreground">
            Tu información ha sido enviada para revisión. Te contactaremos pronto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <h1 className="font-display text-4xl tracking-tight text-foreground">
            Registro de Participante
          </h1>
          <p className="mt-2 text-muted-foreground">
            Completa el formulario para registrarte en el programa
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-10 space-y-6">
          {error && (
            <div className="rounded-lg border border-error/50 bg-error/10 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <h3 className="font-display text-lg text-foreground">Información Personal</h3>

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-foreground">
                Nombre completo *
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="documentNumber" className="block text-sm font-medium text-foreground">
                  Número de documento *
                </label>
                <input
                  id="documentNumber"
                  name="documentNumber"
                  type="text"
                  value={formData.documentNumber}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label htmlFor="birthDate" className="block text-sm font-medium text-foreground">
                  Fecha de nacimiento
                </label>
                <input
                  id="birthDate"
                  name="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-foreground">
                Género
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Seleccionar</option>
                <option value="Femenino">Femenino</option>
                <option value="Masculino">Masculino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-display text-lg text-foreground">Contacto</h3>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Correo electrónico *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label htmlFor="phoneDialCode" className="block text-sm font-medium text-foreground">
                  Código
                </label>
                <input
                  id="phoneDialCode"
                  name="phoneDialCode"
                  type="text"
                  value={formData.phoneDialCode}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-foreground">
                  Número de teléfono
                </label>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="text"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label htmlFor="department" className="block text-sm font-medium text-foreground">
                Departamento
              </label>
              <select
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Seleccionar</option>
                <option value="San José">San José</option>
                <option value="Alajuela">Alajuela</option>
                <option value="Cartago">Cartago</option>
                <option value="Heredia">Heredia</option>
                <option value="Guanacaste">Guanacaste</option>
                <option value="Puntarenas">Puntarenas</option>
                <option value="Limón">Limón</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-display text-lg text-foreground">Información Profesional</h3>

            <div>
              <label htmlFor="roleFunction" className="block text-sm font-medium text-foreground">
                Función / Rol
              </label>
              <input
                id="roleFunction"
                name="roleFunction"
                type="text"
                value={formData.roleFunction}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Ej: Esteticista, Cosmetóloga..."
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-foreground">
                Observaciones
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-start gap-3">
            <input
              id="consent"
              name="consent"
              type="checkbox"
              checked={formData.consent}
              onChange={handleChange}
              className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
              required
            />
            <label htmlFor="consent" className="text-sm text-muted-foreground">
              Acepto que mis datos sean utilizados para el programa de formación. *
            </label>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-primary py-3 text-base font-medium text-primary-foreground transition-colors hover:bg-gold-dark disabled:opacity-50"
            >
              {loading ? 'Registrando...' : 'Registrarse'}
            </button>
            <Link
              to="/login"
              className="flex items-center justify-center rounded-lg border border-border px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
