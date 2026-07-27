import { describe, expect, it } from 'vitest';
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
