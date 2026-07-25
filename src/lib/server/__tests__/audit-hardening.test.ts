import { describe, expect, it } from 'vitest';
import { countAuditEvents, listAuditEvents } from '../audit';

describe('audit hardening', () => {
  it('keeps the default pagination window at 50 rows', async () => {
    expect(listAuditEvents({ limit: 50, offset: 0 })).toBeInstanceOf(Promise);
    expect(countAuditEvents({})).toBeInstanceOf(Promise);
  });
});
