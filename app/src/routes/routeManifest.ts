import type { Role } from '@/types'

export const ROUTE_ALLOWLIST = {
  '/dashboard': ['admin', 'facilitador', 'empleado'],
  '/dashboard/registros': ['admin', 'facilitador', 'empleado'],
  '/dashboard/cursos': ['admin'],
  '/dashboard/reportes': ['admin'],
  '/dashboard/config': ['admin', 'facilitador', 'empleado', 'participante'],
} as const satisfies Record<string, readonly Role[]>

export type RouteId = keyof typeof ROUTE_ALLOWLIST

export function getAllowedRoles(routeId: RouteId): readonly Role[] {
  return ROUTE_ALLOWLIST[routeId]
}
