import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock('../db', () => ({ query: queryMock }));

import { countLegacyFacilitadoraRows } from '../permissions';

describe('role drift', () => {
  beforeEach(() => queryMock.mockReset());

  it('reports legacy facilitadora rows without modifying them', async () => {
    queryMock.mockResolvedValue({ rows: [{ count: '1' }] });

    await expect(countLegacyFacilitadoraRows()).resolves.toBe(1);
    expect(queryMock).toHaveBeenCalledWith(
      `SELECT COUNT(*)::text AS count FROM users WHERE role = 'facilitadora'`,
    );
  });
});
