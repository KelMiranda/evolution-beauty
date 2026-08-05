import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// ─── Test Utilities ──────────────────────────────────────────────────────────

export { userEvent };

// React pages register GSAP ScrollTrigger at import time; jsdom does not
// implement matchMedia or requestAnimationFrame, so component suites
// need the browser contract stubbed. The unhandled exception in
// `gsap/ScrollTrigger.js:372` is `requestAnimationFrame is not defined`
// when GSAP's internal scroll sync fires a real RAF after the test
// environment is torn down; the noop + vi.fn() shims below prevent it.
if (typeof globalThis.requestAnimationFrame !== 'function') {
  globalThis.requestAnimationFrame = vi.fn((cb: (t: number) => void) =>
    setTimeout(() => cb(Date.now()), 16),
  ) as unknown as typeof globalThis.requestAnimationFrame;
}
if (typeof globalThis.cancelAnimationFrame !== 'function') {
  globalThis.cancelAnimationFrame = vi.fn(
    (handle: number) => clearTimeout(handle as unknown as ReturnType<typeof setTimeout>),
  ) as unknown as typeof globalThis.cancelAnimationFrame;
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

export function renderWithRouter(ui: React.ReactElement) {
  // Lazy import to avoid circular deps
  const { render } = require('@testing-library/react');
  return render(ui);
}

export function mockSession(user?: {
  id: number;
  email: string;
  full_name: string;
  role: 'admin' | 'facilitador' | 'empleado' | 'participante';
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
      meta: { page: 1, limit: 20, offset: 0, total: 1 },
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
