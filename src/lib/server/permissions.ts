import { query } from './db';

export const ROLES = ['admin', 'facilitador', 'empleado', 'participante'] as const;
export const canonicalRoles = ROLES;

export type CanonicalRole = (typeof ROLES)[number];

export class RoleCoercionError extends Error {
  constructor(public readonly originalRole: string) {
    super(`Cannot coerce role '${originalRole}' to a canonical role`);
    this.name = 'RoleCoercionError';
  }
}

export function isRole(role: string): role is CanonicalRole {
  return ROLES.includes(role as CanonicalRole);
}

export type PermissionKey =
  | 'dashboard:view'
  | 'participants:create'
  | 'participants:manage'
  | 'participants:export'
  | 'participants:audit'
  | 'users:manage'
  | 'users:audit'
  | 'facilitators:validate'
  | 'courses:view'
  | 'courses:manage'
  | 'enrollments:view'
  | 'enrollments:manage';

const permissionMatrix: Record<CanonicalRole, PermissionKey[]> = {
  admin: ['dashboard:view', 'participants:create', 'participants:manage', 'participants:export', 'participants:audit', 'users:manage', 'users:audit', 'facilitators:validate', 'courses:view', 'courses:manage', 'enrollments:view', 'enrollments:manage'],
  empleado: ['dashboard:view', 'participants:create', 'participants:manage', 'participants:export', 'participants:audit', 'facilitators:validate', 'courses:view', 'enrollments:view'],
  facilitador: ['participants:create', 'courses:view', 'enrollments:view'],
  participante: ['courses:view'],
};

export function canonicalizeRole(role: string): CanonicalRole {
  const normalized = role.trim().toLowerCase();

  if (isRole(normalized)) return normalized;

  switch (normalized) {
    case 'employee':
    case 'operator':
      return 'empleado';
    case 'instructor':
      return 'facilitador';
    case 'participant':
    case 'viewer':
      return 'participante';
    default:
      throw new RoleCoercionError(role);
  }
}

export const normalizeRole = canonicalizeRole;

export async function countLegacyFacilitadoraRows(): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM users WHERE role = 'facilitadora'`,
  );
  return Number(result.rows[0]?.count ?? '0');
}

export function hasPermission(user: { role: CanonicalRole } | null, permission: PermissionKey) {
  if (!user) return false;
  const allowed = permissionMatrix[user.role as CanonicalRole];
  return Boolean(allowed?.includes(permission));
}

export function requirePermission(user: { role: CanonicalRole } | null, permission: PermissionKey) {
  return hasPermission(user, permission);
}

export function canViewDashboard(user: { role: CanonicalRole } | null) {
  return hasPermission(user, 'dashboard:view');
}

export function canCreateParticipants(user: { role: CanonicalRole } | null) {
  return hasPermission(user, 'participants:create');
}

export function canManageParticipants(user: { role: CanonicalRole } | null) {
  return hasPermission(user, 'participants:manage');
}

export function canExportParticipants(user: { role: CanonicalRole } | null) {
  return hasPermission(user, 'participants:export');
}

export function canViewAuditTrail(user: { role: CanonicalRole } | null) {
  return hasPermission(user, 'users:audit');
}

export function canValidateFacilitators(user: { role: CanonicalRole } | null) {
  return hasPermission(user, 'facilitators:validate');
}

export function canManageUsers(user: { role: CanonicalRole } | null) {
  return hasPermission(user, 'users:manage');
}

export function canViewCourses(user: { role: CanonicalRole } | null) {
  return hasPermission(user, 'courses:view');
}

export function canManageCourses(user: { role: CanonicalRole } | null) {
  return hasPermission(user, 'courses:manage');
}

export function canViewEnrollments(user: { role: CanonicalRole } | null) {
  return hasPermission(user, 'enrollments:view');
}

export function canManageEnrollments(user: { role: CanonicalRole } | null) {
  return hasPermission(user, 'enrollments:manage');
}
