export default function CoursesPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <h1 className="font-display text-2xl text-foreground">Cursos</h1>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="text-center">
          <h2 className="font-display text-3xl text-foreground">Próximamente</h2>
          <p className="mt-2 text-muted-foreground">
            El catálogo de cursos estará disponible pronto.
          </p>
        </div>
      </main>
    </div>
  );
}
