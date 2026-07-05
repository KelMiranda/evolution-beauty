import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getParticipants, patchParticipant } from '@/services/api';

export default function RestoreParticipantPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [participantName, setParticipantName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchParticipant = async () => {
      try {
        const result = await getParticipants({ page: 1, limit: 100 });
        const found = result.data.find(p => p.id === Number(id));
        if (found) {
          setParticipantName(found.full_name);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchParticipant();
  }, [id]);

  const handleRestore = async () => {
    setRestoring(true);
    setError(null);
    try {
      await patchParticipant(Number(id), {
        lifecycle_state: 'active',
      });
      setSuccess(true);
    } catch (err) {
      if (err instanceof Error && err.message.includes('409')) {
        setError('No se puede restaurar este participante. Verifica que no tenga restricciones.');
      } else {
        setError(err instanceof Error ? err.message : 'Error al restaurar');
      }
    } finally {
      setRestoring(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="mt-6 font-display text-3xl text-foreground">Participante restaurado</h2>
          <p className="mt-3 text-muted-foreground">
            {participantName} ha sido restaurado exitosamente.
          </p>
          <div className="mt-8 flex gap-4 justify-center">
            <Link
              to="/admin/participants"
              className="px-6 py-2.5 bg-gold text-charcoal text-sm font-semibold rounded-xl hover:bg-gold-light transition-colors"
            >
              Ver participantes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto max-w-md flex items-center gap-4">
          <Link to={`/admin/participants/${id}`} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <span className="font-mono text-[10px] tracking-wider uppercase text-gold">Administración</span>
            <h1 className="font-display text-2xl text-foreground">Restaurar Participante</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-6 py-12">
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
            <RotateCcw className="w-8 h-8 text-amber-500" />
          </div>

          <h2 className="font-display text-2xl text-foreground mb-2">¿Restaurar participante?</h2>
          <p className="text-muted-foreground mb-6">
            {participantName ? (
              <>El participante <strong className="text-foreground">{participantName}</strong> será reactivado y podr\u00e1 ser utilizado nuevamente.</>
            ) : (
              'Este participante será reactivado y podrá ser utilizado nuevamente.'
            )}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-left">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-4">
            <Link
              to={`/admin/participants/${id}`}
              className="px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </Link>
            <button
              onClick={handleRestore}
              disabled={restoring}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-all disabled:opacity-50"
            >
              {restoring ? (
                'Restaurando...'
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  Restaurar
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
