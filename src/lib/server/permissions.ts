export const canonicalRoles = ['admin', 'empleado', 'facilitador', 'participante'] as const;

export type CanonicalRole = (typeof canonicalRoles)[number];

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

export function normalizeRole(role: string): CanonicalRole {
  const normalized = role.trim().toLowerCase();

  switch (normalized) {
    case 'admin':
      return 'admin';
    case 'empleado':
    case 'employee':
    case 'operator':
      return 'empleado';
    case 'facilitador':
    case 'facilitadora':
    case 'instructor':
      return 'facilitador';
    case 'participante':
    case 'participant':
    case 'viewer':
      return 'participante';
    default:
      return 'participante';
  }
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
