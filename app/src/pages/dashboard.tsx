import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="font-display text-2xl text-foreground">Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <button
              onClick={() => logout()}
              className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-12">
        <h2 className="font-display text-3xl text-foreground">Bienvenido, {user?.full_name}</h2>
        <p className="mt-2 text-muted-foreground">Rol: {user?.role}</p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-display text-xl text-foreground">Participantes</h3>
            <p className="mt-1 text-sm text-muted-foreground">Gestión de participantes</p>
            <a href="/admin/participants" className="mt-4 inline-block text-primary hover:text-gold-dark">
              Ir a participantes →
            </a>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-display text-xl text-foreground">Usuarios</h3>
            <p className="mt-1 text-sm text-muted-foreground">Administración de usuarios</p>
            <a href="/admin/users" className="mt-4 inline-block text-primary hover:text-gold-dark">
              Ir a usuarios →
            </a>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-display text-xl text-foreground">Auditoría</h3>
            <p className="mt-1 text-sm text-muted-foreground">Registro de actividades</p>
            <a href="/admin/audit" className="mt-4 inline-block text-primary hover:text-gold-dark">
              Ver auditoría →
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
