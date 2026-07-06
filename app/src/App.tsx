import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { SmoothScroll } from '@/components/SmoothScroll'
import { PublicLayout } from '@/layouts/PublicLayout'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { LandingPage } from '@/pages/LandingPage'
import { RegistroPage } from '@/pages/RegistroPage'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ReportesPage } from '@/pages/ReportesPage'
import { ConfigPage } from '@/pages/ConfigPage'
import { CatalogoCursosPage } from '@/pages/CatalogoCursosPage'
import { CursoDetallePage } from '@/pages/CursoDetallePage'
import { AdminCursosPage } from '@/pages/AdminCursosPage'
import { useAuth } from '@/hooks/useAuth'

function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-charcoal">
      <div className="w-8 h-8 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
    </div>
  )
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}

export default function App() {
  return (
    <SmoothScroll>
      <Routes>
        {/* Public routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/cursos" element={<CatalogoCursosPage />} />
          <Route path="/cursos/:id" element={<CursoDetallePage />} />
          <Route path="/registro" element={<RegistroPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Dashboard routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/registros" element={<DashboardPage />} />
            <Route path="/dashboard/cursos" element={<AdminCursosPage />} />
            <Route path="/dashboard/reportes" element={<ReportesPage />} />
            <Route path="/dashboard/config" element={<ConfigPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SmoothScroll>
  )
}
