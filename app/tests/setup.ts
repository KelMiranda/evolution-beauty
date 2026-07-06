import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// ─── Test Utilities ──────────────────────────────────────────────────────────

export { userEvent };

export function renderWithRouter(ui: React.ReactElement) {
  // Lazy import to avoid circular deps
  const { render } = require('@testing-library/react');
  return render(ui);
}

export function mockSession(user?: {
  id: number;
  email: string;
  full_name: string;
  role: 'admin' | 'facilitadora' | 'participante';
  active: boolean;
} | null) {
  if (user) {
    return HttpResponse.json({ user });
  }
  return new HttpResponse(null, { status: 401 });
}

// ─── MSW Server ─────────────────────────────────────────────────────────────

export const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());

// ─── Default API Handlers ────────────────────────────────────────────────────

export const handlers = {
  login: http.post('/api/login', () =>
    HttpResponse.json({
      user: {
        id: 1,
        email: 'admin@acoes.local',
        full_name: 'Admin User',
        role: 'admin',
        active: true,
      },
      redirectTo: '/dashboard',
    })
  ),
  logout: http.post('/api/logout', () => HttpResponse.json({ ok: true })),
  getMe: http.get('/api/me', () =>
    HttpResponse.json({
      user: {
        id: 1,
        email: 'admin@acoes.local',
        full_name: 'Admin User',
        role: 'admin',
        active: true,
      },
    })
  ),
  participants: http.get('/api/participants', () =>
    HttpResponse.json({
      data: [
        {
          id: 1,
          participant_code: 'P001',
          full_name: 'Test Participant',
          document_number: '12345678',
          birth_date: '1990-01-01',
          gender: 'female',
          phone_country: 'SV',
          phone_dial_code: '+503',
          phone_number: '12345678',
          phone: '+503 1234 5678',
          email: 'test@example.com',
          address: null,
          municipality: null,
          department: 'San Salvador',
          district: null,
          organization: 'Test Org',
          role_function: 'teacher',
          education_level: 'bachillerato',
          program: 'Digital Skills',
          status: 'active',
          lifecycle_state: 'active',
          deleted_at: null,
          deleted_by: null,
          notes: null,
          consent: true,
          created_by: 1,
          updated_by: 1,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
      meta: { page: 1, limit: 20, offset: 0 },
    })
  ),
  courses: http.get('/api/courses', () =>
    HttpResponse.json({
      data: [
        {
          id: 1,
          name: 'Digital Skills Course',
          description: 'Learn digital skills',
          category: 'technology',
          level: 'beginner',
          instructor: 'Test Instructor',
          instructor_bio: null,
          price: 0,
          price_original: null,
          image: null,
          fecha_inicio: '2024-01-01',
          fecha_fin: '2024-03-01',
          horario: 'Monday 9-11am',
          ubicacion: 'Online',
          lat: null,
          lng: null,
          cupo_maximo: 20,
          inscritos: 5,
          estado: 'published',
          tags: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
    })
  ),
  users: http.get('/api/users', () =>
    HttpResponse.json({
      data: [
        {
          id: 1,
          email: 'admin@acoes.local',
          full_name: 'Admin User',
          role: 'admin',
          active: true,
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
    })
  ),
  audit: http.get('/api/audit', () =>
    HttpResponse.json({
      data: [],
      meta: { total: 0, limit: 20, offset: 0 },
    })
  ),
  dashboard: http.get('/api/dashboard/indicators', () =>
    HttpResponse.json({
      indicators: {
        byDepartment: { 'San Salvador': 10 },
        byProgram: { 'Digital Skills': 8 },
        byEducationLevel: { bachillerato: 5 },
        byRoleFunction: { teacher: 3 },
        byGender: { female: 6, male: 4 },
      },
    })
  ),
};
