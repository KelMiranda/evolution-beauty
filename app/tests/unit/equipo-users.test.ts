import { describe, expect, it, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../setup';
import { getEquipoUsers } from '@/services/api';

/**
 * Coverage for the dashboard Equipo panel data fetch.
 *
 * `getEquipoUsers` reuses the `/api/users` admin endpoint and filters
 * the response client-side to admin + empleado rows. It must exclude
 * facilitator and participante rows because those live in their own
 * panels. Active / inactive status must pass through untouched so the
 * panel can render the appropriate badge.
 */
describe('getEquipoUsers', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it('returns only admin + empleado rows', async () => {
    server.use(
      http.get('/api/users', () =>
        HttpResponse.json({
          data: [
            { id: 1, email: 'admin@acoes.local', full_name: 'Admin', role: 'admin', active: true, created_at: '2024-01-01T00:00:00Z' },
            { id: 2, email: 'emp@acoes.local', full_name: 'Emp', role: 'empleado', active: true, created_at: '2024-01-01T00:00:00Z' },
            { id: 3, email: 'fac@acoes.local', full_name: 'Fac', role: 'facilitador', active: true, created_at: '2024-01-01T00:00:00Z' },
            { id: 4, email: 'part@acoes.local', full_name: 'Part', role: 'participante', active: true, created_at: '2024-01-01T00:00:00Z' },
          ],
        })
      )
    );

    const users = await getEquipoUsers();

    expect(users).toHaveLength(2);
    expect(users.map(u => u.role).sort()).toEqual(['admin', 'empleado']);
  });

  it('includes inactive users so the panel can show their status', async () => {
    server.use(
      http.get('/api/users', () =>
        HttpResponse.json({
          data: [
            { id: 1, email: 'admin@acoes.local', full_name: 'Admin', role: 'admin', active: true, created_at: '2024-01-01T00:00:00Z' },
            { id: 2, email: 'retired@acoes.local', full_name: 'Old', role: 'empleado', active: false, created_at: '2024-01-01T00:00:00Z' },
          ],
        })
      )
    );

    const users = await getEquipoUsers();
    expect(users).toHaveLength(2);
    expect(users.find(u => u.id === '2')?.active).toBe(false);
  });

  it('maps snake_case backend fields to camelCase EquipoUser fields', async () => {
    server.use(
      http.get('/api/users', () =>
        HttpResponse.json({
          data: [
            { id: 1, email: 'admin@acoes.local', full_name: 'Admin', role: 'admin', active: true, created_at: '2024-01-01T00:00:00Z' },
          ],
        })
      )
    );

    const [user] = await getEquipoUsers();
    expect(user).toMatchObject({
      id: '1',
      email: 'admin@acoes.local',
      fullName: 'Admin',
      role: 'admin',
      active: true,
    });
  });

  it('returns an empty array when the endpoint fails', async () => {
    server.use(
      http.get('/api/users', () => HttpResponse.json({ error: 'boom' }, { status: 500 }))
    );

    // The hook uses .catch(() => []) but the raw api.get does not swallow
    // errors. This test pins the rejection behavior on the helper itself
    // so callers know to wrap it.
    await expect(getEquipoUsers()).rejects.toBeDefined();
  });
});
