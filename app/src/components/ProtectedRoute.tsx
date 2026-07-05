import type { ReactNode } from 'react';
import { Navigate } from 'react-router/dom';
import { useAuth } from '@/hooks/useAuth';

type Props = {
  children: ReactNode;
  requiredRole?: 'admin' | 'facilitadora' | 'participante' | Array<'admin' | 'facilitadora' | 'participante'>;
};

export function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
