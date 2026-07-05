export const canonicalRoles = ['admin', 'facilitadora', 'participante'] as const;

export type CanonicalRole = (typeof canonicalRoles)[number];

export type PermissionKey =
  | 'dashboard:view'
  | 'participants:create'
  | 'participants:manage'
  | 'participants:export'
  | 'participants:audit'
  | 'users:manage'
  | 'users:audit';

const permissionMatrix: Record<CanonicalRole, PermissionKey[]> = {
  admin: ['dashboard:view', 'participants:create', 'participants:manage', 'participants:export', 'participants:audit', 'users:manage', 'users:audit'],
  facilitadora: ['participants:create'],
  participante: [],
};

export function normalizeRole(role: string): CanonicalRole {
  switch (role) {
    case 'admin':
      return 'admin';
    case 'operator':
      return 'facilitadora';
    case 'viewer':
      return 'participante';
    case 'facilitadora':
      return 'facilitadora';
    case 'participante':
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

export function canManageUsers(user: { role: CanonicalRole } | null) {
  return hasPermission(user, 'users:manage');
}
