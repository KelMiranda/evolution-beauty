import { describe, it, expect } from 'vitest';
import type { AuthUser } from '@/services/api';

// ─── Permission Matrix ───────────────────────────────────────────────────────

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
  facilitadora: [
    'view_dashboard',
    'participant_crud',
    'enroll_participants',
  ],
  participante: [],
};

function hasPermission(
  role: AuthUser['role'],
  permission: Permission
): boolean {
  return permissions[role].includes(permission);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Auth Permission Matrix', () => {
  describe('Admin permissions', () => {
    const role: AuthUser['role'] = 'admin';

    it('can view dashboard', () => {
      expect(hasPermission(role, 'view_dashboard')).toBe(true);
    });

    it('can perform participant CRUD', () => {
      expect(hasPermission(role, 'participant_crud')).toBe(true);
    });

    it('can manage participant lifecycle', () => {
      expect(hasPermission(role, 'participant_lifecycle')).toBe(true);
    });

    it('can manage users', () => {
      expect(hasPermission(role, 'user_management')).toBe(true);
    });

    it('can view audit trail', () => {
      expect(hasPermission(role, 'audit_view')).toBe(true);
    });

    it('can create/update/delete courses', () => {
      expect(hasPermission(role, 'course_cud')).toBe(true);
    });

    it('can enroll participants', () => {
      expect(hasPermission(role, 'enroll_participants')).toBe(true);
    });

    it('can view reports', () => {
      expect(hasPermission(role, 'view_reports')).toBe(true);
    });
  });

  describe('Facilitadora permissions', () => {
    const role: AuthUser['role'] = 'facilitadora';

    it('can view dashboard', () => {
      expect(hasPermission(role, 'view_dashboard')).toBe(true);
    });

    it('can create participants', () => {
      expect(hasPermission(role, 'participant_crud')).toBe(true);
    });

    it('cannot manage participant lifecycle', () => {
      expect(hasPermission(role, 'participant_lifecycle')).toBe(false);
    });

    it('cannot manage users', () => {
      expect(hasPermission(role, 'user_management')).toBe(false);
    });

    it('cannot view audit trail', () => {
      expect(hasPermission(role, 'audit_view')).toBe(false);
    });

    it('cannot create/update/delete courses', () => {
      expect(hasPermission(role, 'course_cud')).toBe(false);
    });

    it('can enroll participants', () => {
      expect(hasPermission(role, 'enroll_participants')).toBe(true);
    });

    it('cannot view reports', () => {
      expect(hasPermission(role, 'view_reports')).toBe(false);
    });
  });

  describe('Participante permissions', () => {
    const role: AuthUser['role'] = 'participante';

    it('cannot view dashboard', () => {
      expect(hasPermission(role, 'view_dashboard')).toBe(false);
    });

    it('cannot perform participant CRUD', () => {
      expect(hasPermission(role, 'participant_crud')).toBe(false);
    });

    it('cannot manage participant lifecycle', () => {
      expect(hasPermission(role, 'participant_lifecycle')).toBe(false);
    });

    it('cannot manage users', () => {
      expect(hasPermission(role, 'user_management')).toBe(false);
    });

    it('cannot view audit trail', () => {
      expect(hasPermission(role, 'audit_view')).toBe(false);
    });

    it('cannot create/update/delete courses', () => {
      expect(hasPermission(role, 'course_cud')).toBe(false);
    });

    it('cannot enroll participants', () => {
      expect(hasPermission(role, 'enroll_participants')).toBe(false);
    });

    it('cannot view reports', () => {
      expect(hasPermission(role, 'view_reports')).toBe(false);
    });
  });
});
