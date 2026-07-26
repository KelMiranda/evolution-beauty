import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock('../db', () => ({ query: queryMock }));

import { getParticipantByDocumentNumber } from '../participants';

describe('getParticipantByDocumentNumber', () => {
  beforeEach(() => queryMock.mockReset());

  it('returns null for any input that does not normalize to canonical', async () => {
    expect(await getParticipantByDocumentNumber('')).toBeNull();
    expect(await getParticipantByDocumentNumber('1234')).toBeNull();
    expect(await getParticipantByDocumentNumber('12345678901234')).toBeNull();
    expect(await getParticipantByDocumentNumber('abcdefgh-i')).toBeNull();
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('queries by the canonical form for a nine-digit DUI', async () => {
    queryMock.mockResolvedValue({ rows: [{ id: 7, document_number: '12345678-9' }] });

    const result = await getParticipantByDocumentNumber('123456789');
    expect(result).toEqual({ id: 7, document_number: '12345678-9' });
    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('document_number = $1');
    expect(sql).toContain('deleted_at IS NULL');
    expect(params).toEqual(['12345678-9']);
  });

  it('queries by the canonical form for an already-canonical DUI', async () => {
    queryMock.mockResolvedValue({ rows: [] });

    await getParticipantByDocumentNumber('12345678-9');
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('document_number = $1');
    expect(sql).toContain('deleted_at IS NULL');
    expect(params).toEqual(['12345678-9']);
  });

  it('strips whitespace before querying', async () => {
    queryMock.mockResolvedValue({ rows: [] });

    await getParticipantByDocumentNumber('  00000 000-0  ');
    const [, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(params).toEqual(['00000000-0']);
  });

  it('excludes soft-deleted participants by default', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    await getParticipantByDocumentNumber('12345678-9');
    const [sql] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('AND deleted_at IS NULL');
  });

  it('can include soft-deleted participants when requested', async () => {
    queryMock.mockResolvedValue({ rows: [{ id: 9, deleted_at: '2026-01-01' }] });

    const result = await getParticipantByDocumentNumber('12345678-9', { includeDeleted: true });
    expect(result).toEqual({ id: 9, deleted_at: '2026-01-01' });
    const [sql] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).not.toContain('deleted_at IS NULL');
  });

  it('returns null when the query has no rows', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    const result = await getParticipantByDocumentNumber('12345678-9');
    expect(result).toBeNull();
  });
});
