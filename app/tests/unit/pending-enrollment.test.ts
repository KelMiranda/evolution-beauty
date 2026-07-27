import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  PENDING_ENROLLMENT_KEY,
  PENDING_ENROLLMENT_TTL_MS,
  clearPending,
  isExpired,
  loadPending,
  matchesPending,
  savePending,
  type PendingEnrollment,
} from '@/lib/pendingEnrollment';

describe('pendingEnrollment sessionStorage bridge', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('savePending + loadPending round-trip', () => {
    it('persists and returns the same payload', () => {
      savePending({ token: 'tok-9-abc', dui: '12345678-9', courseId: '9' });
      const loaded = loadPending();
      expect(loaded).not.toBeNull();
      expect(loaded?.token).toBe('tok-9-abc');
      expect(loaded?.dui).toBe('12345678-9');
      expect(loaded?.courseId).toBe('9');
      expect(typeof loaded?.ts).toBe('number');
      // The ts should be stamped if not provided
      expect(Math.abs((loaded?.ts ?? 0) - Date.now())).toBeLessThan(1000);
    });

    it('stores the JSON under the canonical key', () => {
      savePending({ token: 'tok', dui: '12345678-9', courseId: '9' });
      const raw = sessionStorage.getItem(PENDING_ENROLLMENT_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw as string) as PendingEnrollment;
      expect(parsed.token).toBe('tok');
      expect(parsed.dui).toBe('12345678-9');
      expect(parsed.courseId).toBe('9');
    });

    it('uses an explicit ts when provided', () => {
      const fixedTs = 1_700_000_000_000;
      savePending({ token: 'tok', dui: '12345678-9', courseId: '9', ts: fixedTs });
      const loaded = loadPending();
      expect(loaded?.ts).toBe(fixedTs);
    });
  });

  describe('clearPending', () => {
    it('removes the entry', () => {
      savePending({ token: 'tok', dui: '12345678-9', courseId: '9' });
      clearPending();
      expect(loadPending()).toBeNull();
      expect(sessionStorage.getItem(PENDING_ENROLLMENT_KEY)).toBeNull();
    });

    it('is a no-op when the entry does not exist', () => {
      expect(() => clearPending()).not.toThrow();
      expect(loadPending()).toBeNull();
    });
  });

  describe('error tolerance', () => {
    it('returns null for missing key', () => {
      expect(loadPending()).toBeNull();
    });

    it('returns null for corrupted JSON', () => {
      sessionStorage.setItem(PENDING_ENROLLMENT_KEY, '{not valid json');
      expect(loadPending()).toBeNull();
    });

    it('returns null when the stored payload does not match the shape', () => {
      sessionStorage.setItem(PENDING_ENROLLMENT_KEY, JSON.stringify({ foo: 'bar' }));
      expect(loadPending()).toBeNull();
    });

    it('returns null when fields have the wrong types', () => {
      sessionStorage.setItem(
        PENDING_ENROLLMENT_KEY,
        JSON.stringify({ token: 123, dui: '12345678-9', courseId: '9', ts: 'now' }),
      );
      expect(loadPending()).toBeNull();
    });

    it('returns null when ts is NaN', () => {
      sessionStorage.setItem(
        PENDING_ENROLLMENT_KEY,
        JSON.stringify({ token: 't', dui: '12345678-9', courseId: '9', ts: Number.NaN }),
      );
      expect(loadPending()).toBeNull();
    });

    it('survives a sessionStorage.setItem that throws', () => {
      const original = sessionStorage.setItem.bind(sessionStorage);
      sessionStorage.setItem = () => {
        throw new Error('quota exceeded');
      };
      try {
        expect(() => savePending({ token: 't', dui: '12345678-9', courseId: '9' })).not.toThrow();
      } finally {
        sessionStorage.setItem = original;
      }
    });

    it('survives a sessionStorage.removeItem that throws', () => {
      savePending({ token: 't', dui: '12345678-9', courseId: '9' });
      const original = sessionStorage.removeItem.bind(sessionStorage);
      sessionStorage.removeItem = () => {
        throw new Error('boom');
      };
      try {
        expect(() => clearPending()).not.toThrow();
      } finally {
        sessionStorage.removeItem = original;
      }
    });
  });

  describe('TTL (10 minutes)', () => {
    const ttl = PENDING_ENROLLMENT_TTL_MS;

    it('an entry stamped right now is not expired', () => {
      const p: PendingEnrollment = { token: 't', dui: '12345678-9', courseId: '9', ts: Date.now() };
      expect(isExpired(p)).toBe(false);
    });

    it('an entry stamped just inside the window is not expired', () => {
      const p: PendingEnrollment = {
        token: 't',
        dui: '12345678-9',
        courseId: '9',
        ts: Date.now() - (ttl - 1000),
      };
      expect(isExpired(p)).toBe(false);
    });

    it('an entry stamped just past the window is expired', () => {
      const p: PendingEnrollment = {
        token: 't',
        dui: '12345678-9',
        courseId: '9',
        ts: Date.now() - (ttl + 1000),
      };
      expect(isExpired(p)).toBe(true);
    });

    it('the TTL is 10 minutes', () => {
      expect(PENDING_ENROLLMENT_TTL_MS).toBe(600_000);
    });
  });

  describe('matchesPending', () => {
    const now = 1_700_000_000_000;
    const fresh: PendingEnrollment = {
      token: 'tok-9',
      dui: '12345678-9',
      courseId: '9',
      ts: now,
    };

    it('matches when courseId and token are equal and the entry is fresh', () => {
      expect(matchesPending(fresh, '9', 'tok-9', now)).toBe(true);
    });

    it('rejects a different courseId', () => {
      expect(matchesPending(fresh, '10', 'tok-9', now)).toBe(false);
    });

    it('rejects a different token', () => {
      expect(matchesPending(fresh, '9', 'tok-other', now)).toBe(false);
    });

    it('rejects an expired entry even when courseId + token match', () => {
      const stale: PendingEnrollment = { ...fresh, ts: now - (PENDING_ENROLLMENT_TTL_MS + 1000) };
      expect(matchesPending(stale, '9', 'tok-9', now)).toBe(false);
    });
  });
});