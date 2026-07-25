import { describe, expect, it } from 'vitest';
import type { AuthUser } from '@/services/api.backend.types';

type Permission =
  | 'view_dashboard'
  | 'participant_crud'
  | 'participant_lifecycle'
  | 'user_management'
  | 'audit_view'
  | 'course_cud'
  | 'enroll_participants'
  | 'view_reports';

const permissions: Record<AuthUser['role'], Permission[]> = {
  admin: [
    'view_dashboard',
    'participant_crud',
    'participant_lifecycle',
    'user_management',
    'audit_view',
    'course_cud',
    'enroll_participants',
    'view_reports',
  ],
  facilitador: ['view_dashboard', 'participant_crud', 'enroll_participants'],
  empleado: [
    'view_dashboard',
    'participant_crud',
    'participant_lifecycle',
    'audit_view',
    'enroll_participants',
    'view_reports',
  ],
  participante: [],
};

function hasPermission(role: AuthUser['role'], permission: Permission): boolean {
  return permissions[role].includes(permission);
}

describe('Auth Permission Matrix', () => {
  it('models exactly the four canonical roles', () => {
    expect(Object.keys(permissions)).toEqual([
      'admin',
      'facilitador',
      'empleado',
      'participante',
    ]);
  });

  it('grants administrative permissions only to admin', () => {
    expect(hasPermission('admin', 'user_management')).toBe(true);
    expect(hasPermission('facilitador', 'user_management')).toBe(false);
    expect(hasPermission('empleado', 'user_management')).toBe(false);
    expect(hasPermission('participante', 'user_management')).toBe(false);
  });

  it('grants facilitador participant and enrollment work without reports', () => {
    expect(hasPermission('facilitador', 'participant_crud')).toBe(true);
    expect(hasPermission('facilitador', 'enroll_participants')).toBe(true);
    expect(hasPermission('facilitador', 'view_reports')).toBe(false);
  });

  it('grants empleado operational permissions without user management', () => {
    expect(hasPermission('empleado', 'participant_lifecycle')).toBe(true);
    expect(hasPermission('empleado', 'audit_view')).toBe(true);
    expect(hasPermission('empleado', 'user_management')).toBe(false);
  });

  it('keeps participante out of protected dashboard actions', () => {
    for (const permission of permissions.admin) {
      expect(hasPermission('participante', permission)).toBe(false);
    }
  });
});
