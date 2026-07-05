import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function IndexPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <span className="font-display text-2xl tracking-tight text-foreground">
            Evolution Beauty Academy
          </span>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-gold-dark"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  to="/registro"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-gold-dark"
                >
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-24 text-center">
        <h1 className="font-display text-6xl tracking-tight text-foreground md:text-7xl">
          Beauty & Wellness<br />
          <span className="text-gold">Formation</span>
        </h1>
        <p className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground">
          Programa de formación profesional en estética y bienestar.
          Desarrolla tus habilidades y avanza en tu carrera.
        </p>
        <div className="mt-12 flex items-center justify-center gap-4">
          <Link
            to="/registro"
            className="rounded-lg bg-primary px-8 py-3 text-base font-medium text-primary-foreground transition-colors hover:bg-gold-dark"
          >
            Comenzar Ahora
          </Link>
          <Link
            to="/courses"
            className="rounded-lg border border-border px-8 py-3 text-base font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Ver Cursos
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="font-display text-center text-4xl tracking-tight text-foreground">
            ¿Por qué elegirnos?
          </h2>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-background p-8 transition-shadow hover:shadow-card">
              <div className="text-gold mb-4 text-4xl">✦</div>
              <h3 className="font-display text-xl text-foreground">Formación Profesional</h3>
              <p className="mt-2 text-muted-foreground">
                Certificación reconocida para avanzar en tu carrera estética.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-8 transition-shadow hover:shadow-card">
              <div className="text-gold mb-4 text-4xl">✦</div>
              <h3 className="font-display text-xl text-foreground">Metodología Práctica</h3>
              <p className="mt-2 text-muted-foreground">
                Aprende con casos reales y prácticas supervisadas.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-8 transition-shadow hover:shadow-card">
              <div className="text-gold mb-4 text-4xl">✦</div>
              <h3 className="font-display text-xl text-foreground">Comunidad de Apoyo</h3>
              <p className="mt-2 text-muted-foreground">
                Conecta con otros profesionales y comparte experiencias.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
