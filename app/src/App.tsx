import { RouterProvider, createBrowserRouter } from 'react-router/dom';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';

import IndexPage from '@/pages/index';
import LoginPage from '@/pages/login';
import RegistroPage from '@/pages/registro';
import DashboardPage from '@/pages/dashboard';
import CoursesPage from '@/pages/courses';
import AdminParticipantsPage from '@/pages/admin/participants';
import AdminUsersPage from '@/pages/admin/users';
import AdminAuditPage from '@/pages/admin/audit';
import AdminCoursesPage from '@/pages/admin/courses';

const router = createBrowserRouter([
  {
    path: '/',
    element: <IndexPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/registro',
    element: <RegistroPage />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute requiredRole="admin">
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/courses',
    element: <CoursesPage />,
  },
  {
    path: '/admin/participants',
    element: (
      <ProtectedRoute requiredRole={['admin', 'facilitadora']}>
        <AdminParticipantsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/users',
    element: (
      <ProtectedRoute requiredRole="admin">
        <AdminUsersPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/audit',
    element: (
      <ProtectedRoute requiredRole="admin">
        <AdminAuditPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/courses',
    element: (
      <ProtectedRoute requiredRole="admin">
        <AdminCoursesPage />
      </ProtectedRoute>
    ),
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
