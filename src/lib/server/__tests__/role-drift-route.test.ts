import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getCurrentUserMock, requireRoleMock, countLegacyFacilitadoraRowsMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  requireRoleMock: vi.fn(),
  countLegacyFacilitadoraRowsMock: vi.fn(),
}));

vi.mock('../auth', () => ({
  getCurrentUser: getCurrentUserMock,
  requireRole: requireRoleMock,
}));
vi.mock('../permissions', () => ({
  countLegacyFacilitadoraRows: countLegacyFacilitadoraRowsMock,
}));

import { GET } from '../../../pages/api/admin/role-drift';

const context = { cookies: {} } as Parameters<typeof GET>[0];

describe('GET /api/admin/role-drift', () => {
  beforeEach(() => {
    getCurrentUserMock.mockReset();
    requireRoleMock.mockReset();
    countLegacyFacilitadoraRowsMock.mockReset();
  });

  it('returns 401 to an anonymous caller', async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const response = await GET(context);
    expect(response.status).toBe(401);
  });

  it('returns 403 to a non-admin caller', async () => {
    getCurrentUserMock.mockResolvedValue({ role: 'empleado' });
    requireRoleMock.mockReturnValue(false);
    const response = await GET(context);
    expect(response.status).toBe(403);
  });

  it('returns the drift count to an admin', async () => {
    getCurrentUserMock.mockResolvedValue({ role: 'admin' });
    requireRoleMock.mockReturnValue(true);
    countLegacyFacilitadoraRowsMock.mockResolvedValue(2);
    const response = await GET(context);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ legacy_facilitadora_count: 2 });
  });
});
