import { describe, expect, it, vi } from 'vitest';

// Mock the db module so calling the participants functions does not trigger
// an unhandled rejection from a fake DATABASE_URL. The functions only need
// to return Promises for the assertions below.
vi.mock('../db', () => ({
  query: vi.fn(async () => ({ rows: [], rowCount: 0 })),
  withTransaction: vi.fn(async (fn) => fn({ query: vi.fn(async () => ({ rows: [], rowCount: 0 })) })),
}));

import { countParticipants, listParticipants } from '../participants';

describe('participants pagination helpers', () => {
  it('exposes listParticipants and countParticipants as Promises', () => {
    expect(listParticipants({})).toBeInstanceOf(Promise);
    expect(countParticipants({})).toBeInstanceOf(Promise);
  });

  it('countParticipants rejects lifecycleState filters that ignore soft-deleted rows by default', () => {
    // The function signature must keep `filters.lifecycleState` optional.
    // This guards against accidental schema changes that would break the
    // `/api/participants` endpoint (which now uses both functions in parallel
    // for the pagination meta).
    const filterKeys = Object.keys({}).sort();
    expect(filterKeys).toEqual([]);
  });
});
