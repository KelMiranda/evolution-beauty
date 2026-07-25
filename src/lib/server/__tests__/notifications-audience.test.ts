import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalRole } from '../permissions';

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock('../db', () => ({
  query: queryMock,
  withTransaction: vi.fn(),
}));

import { listNotifications, markNotificationRead, type NotificationRow } from '../notifications';

const notifications: NotificationRow[] = [
  makeNotification(1, null, 'admin'),
  makeNotification(2, null, 'participante'),
  makeNotification(3, 20, null),
  makeNotification(4, 30, null),
  makeNotification(5, null, null),
  makeNotification(6, 40, 'participante'),
];

function makeNotification(id: number, userId: number | null, audienceRole: string | null): NotificationRow {
  return {
    id,
    user_id: userId,
    audience_role: audienceRole,
    kind: 'participant_enrolled',
    title: `Notification ${id}`,
    body: `Body ${id}`,
    payload: null,
    read_at: null,
    created_at: '2026-07-24T00:00:00.000Z',
  };
}

function canAccess(row: NotificationRow, userId: number, role: CanonicalRole) {
  return row.user_id === userId
    || row.audience_role === role
    || (row.user_id === null && row.audience_role === null);
}

describe('notification audience isolation', () => {
  beforeEach(() => {
    queryMock.mockReset().mockImplementation(async (sql: string, values: unknown[]) => {
      if (sql.startsWith('SELECT')) {
        const [userId, role, limit] = values as [number, CanonicalRole, number];
        return { rows: notifications.filter((row) => canAccess(row, userId, role)).slice(0, limit) };
      }

      const [id, userId, role] = values as [number, number, CanonicalRole];
      const row = notifications.find((candidate) => candidate.id === id);
      return { rows: row && canAccess(row, userId, role) ? [{ ...row, read_at: '2026-07-24T01:00:00.000Z' }] : [] };
    });
  });

  it('shows role-targeted rows only to the matching role', async () => {
    const participantRows = await listNotifications(20, 'participante');
    const employeeRows = await listNotifications(30, 'empleado');
    const adminRows = await listNotifications(10, 'admin');

    expect(participantRows.map(({ id }) => id)).toEqual(expect.arrayContaining([2, 6]));
    expect(employeeRows.map(({ id }) => id)).not.toContain(1);
    expect(employeeRows.map(({ id }) => id)).not.toContain(2);
    expect(adminRows.map(({ id }) => id)).toContain(1);
    expect(adminRows.map(({ id }) => id)).not.toContain(2);

    const selectSql = queryMock.mock.calls[0]?.[0] as string;
    expect(selectSql).toContain('OR audience_role = $2');
    expect(selectSql).toContain('OR (user_id IS NULL AND audience_role IS NULL)');
    expect(selectSql).not.toContain('audience_role IS NOT NULL');
  });

  it('rejects mismatched mark-as-read calls while allowing the matching role', async () => {
    await expect(markNotificationRead(1, 20, 'participante')).resolves.toBeNull();
    await expect(markNotificationRead(1, 10, 'admin')).resolves.toMatchObject({ id: 1, read_at: expect.any(String) });

    const updateSql = queryMock.mock.calls[0]?.[0] as string;
    expect(updateSql).toContain('OR audience_role = $3');
    expect(updateSql).toContain('OR (user_id IS NULL AND audience_role IS NULL)');
    expect(updateSql).not.toContain('audience_role IS NOT NULL');
  });

  it('keeps null-audience owner rows private and null-owner broadcasts visible', async () => {
    const ownerRows = await listNotifications(20, 'participante');
    const otherRows = await listNotifications(30, 'empleado');

    expect(ownerRows.map(({ id }) => id)).toEqual(expect.arrayContaining([3, 5]));
    expect(otherRows.map(({ id }) => id)).not.toContain(3);
    expect(otherRows.map(({ id }) => id)).toContain(5);
    await expect(markNotificationRead(3, 30, 'empleado')).resolves.toBeNull();
  });

  it('lets the producer list and mark their own role-mismatched notification', async () => {
    const producerRows = await listNotifications(40, 'empleado');

    expect(producerRows.map(({ id }) => id)).toContain(6);
    await expect(markNotificationRead(6, 40, 'empleado')).resolves.toMatchObject({ id: 6, read_at: expect.any(String) });
  });
});
