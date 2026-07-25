import { describe, expect, it } from 'vitest';
import {
  ROLES,
  RoleCoercionError,
  canManageUsers,
  canViewAuditTrail,
  canonicalizeRole,
  isRole,
} from '../permissions';

describe('permissions', () => {
  it('accepts every canonical role verbatim', () => {
    for (const role of ROLES) {
      expect(isRole(role)).toBe(true);
      expect(canonicalizeRole(role)).toBe(role);
    }
  });

  it('grants user management and audit access to admin', () => {
    expect(canManageUsers({ role: 'admin' })).toBe(true);
    expect(canViewAuditTrail({ role: 'admin' })).toBe(true);
  });

  it('keeps non-admin roles out of user management', () => {
    expect(canManageUsers({ role: 'facilitador' })).toBe(false);
    expect(canManageUsers(null)).toBe(false);
  });

  it('rejects the legacy facilitadora role without coercing it', () => {
    expect(() => canonicalizeRole('facilitadora')).toThrow(RoleCoercionError);

    try {
      canonicalizeRole('facilitadora');
    } catch (error) {
      expect(error).toMatchObject({ originalRole: 'facilitadora' });
    }
  });
});
