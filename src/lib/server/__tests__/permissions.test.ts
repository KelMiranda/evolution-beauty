import { describe, expect, it } from 'vitest';
import { canManageUsers, canViewAuditTrail, normalizeRole } from '../permissions';

describe('permissions', () => {
  it('grants user management and audit access to admin', () => {
    expect(canManageUsers({ role: 'admin' })).toBe(true);
    expect(canViewAuditTrail({ role: 'admin' })).toBe(true);
  });

  it('keeps non-admin roles out of user management', () => {
    expect(canManageUsers({ role: 'facilitador' })).toBe(false);
    expect(canManageUsers(null)).toBe(false);
  });

  it('normalizes legacy facilitator role names', () => {
    expect(normalizeRole('facilitadora')).toBe('facilitador');
  });
});
