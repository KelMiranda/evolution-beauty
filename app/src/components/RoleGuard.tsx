import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { Role } from '@/types'

type RoleGuardProps = {
  allowedRoles: readonly Role[]
  children: ReactNode
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { isAuthenticated, loading, role } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal">
        <div className="w-8 h-8 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
      </div>
    )
  }
  if (!isAuthenticated || !role) return <Navigate to="/login" replace />
  if (!allowedRoles.includes(role)) return <Navigate to="/unauthorized" replace />

  return children
}
