import { Route, Routes } from 'react-router-dom'
import { RoleGuard } from '@/components/RoleGuard'
import { SmoothScroll } from '@/components/SmoothScroll'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { PublicLayout } from '@/layouts/PublicLayout'
import { AdminCursosPage } from '@/pages/AdminCursosPage'
import { CatalogoCursosPage } from '@/pages/CatalogoCursosPage'
import { ConfigPage } from '@/pages/ConfigPage'
import { CursoDetallePage } from '@/pages/CursoDetallePage'
import { DashboardPage } from '@/pages/DashboardPage'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RegistroPage } from '@/pages/RegistroPage'
import { ReportesPage } from '@/pages/ReportesPage'
import { UnauthorizedPage } from '@/pages/UnauthorizedPage'
import { getAllowedRoles, type RouteId } from '@/routes/routeManifest'

function ProtectedDashboardRoute({ routeId }: { routeId: RouteId }) {
  return (
    <RoleGuard allowedRoles={getAllowedRoles(routeId)}>
      <DashboardLayout />
    </RoleGuard>
  )
}

export default function App() {
  return (
    <SmoothScroll>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/cursos" element={<CatalogoCursosPage />} />
          <Route path="/cursos/:id" element={<CursoDetallePage />} />
          <Route path="/registro" element={<RegistroPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedDashboardRoute routeId="/dashboard" />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
        <Route element={<ProtectedDashboardRoute routeId="/dashboard/registros" />}>
          <Route path="/dashboard/registros" element={<DashboardPage />} />
        </Route>
        <Route element={<ProtectedDashboardRoute routeId="/dashboard/cursos" />}>
          <Route path="/dashboard/cursos" element={<AdminCursosPage />} />
        </Route>
        <Route element={<ProtectedDashboardRoute routeId="/dashboard/reportes" />}>
          <Route path="/dashboard/reportes" element={<ReportesPage />} />
        </Route>
        <Route element={<ProtectedDashboardRoute routeId="/dashboard/config" />}>
          <Route path="/dashboard/config" element={<ConfigPage />} />
        </Route>

        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </SmoothScroll>
  )
}
