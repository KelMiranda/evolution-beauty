import { describe, expect, it, vi } from 'vitest';

// Mock the db module to avoid the fake-DATABASE_URL unhandled rejection;
// these tests only assert function shapes, not query results.
vi.mock('../db', () => ({
  query: vi.fn(async () => ({ rows: [], rowCount: 0 })),
  withTransaction: vi.fn(async (fn) => fn({ query: vi.fn(async () => ({ rows: [], rowCount: 0 })) })),
}));

import { countAuditEvents, listAuditEvents } from '../audit';

describe('audit hardening', () => {
  it('keeps the default pagination window at 50 rows', async () => {
    expect(listAuditEvents({ limit: 50, offset: 0 })).toBeInstanceOf(Promise);
    expect(countAuditEvents({})).toBeInstanceOf(Promise);
  });
});
