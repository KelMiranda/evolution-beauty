import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getCurrentUserMock,
  canViewCoursesMock,
  getCourseByIdMock,
  queryMock,
  generateCourseEnrollmentTokenMock,
} = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  canViewCoursesMock: vi.fn(),
  getCourseByIdMock: vi.fn(),
  queryMock: vi.fn(),
  generateCourseEnrollmentTokenMock: vi.fn(),
}));

vi.mock('../auth', () => ({
  getCurrentUser: getCurrentUserMock,
}));
vi.mock('../permissions', () => ({
  canViewCourses: canViewCoursesMock,
}));
vi.mock('../courses', () => ({
  getCourseById: getCourseByIdMock,
  generateCourseEnrollmentToken: generateCourseEnrollmentTokenMock,
}));
vi.mock('../db', () => ({
  query: queryMock,
}));
vi.mock('../bootstrap', () => ({
  ensureDatabase: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from '../../../pages/api/courses/[id]/public-link';

const baseCourse = {
  id: 9,
  name: 'Colorimetría Profesional',
  description: '',
  category: 'Colorimetría',
  level: 'Intermedio',
  facilitator_id: 1,
  instructor: 'María Elena Menjívar',
  instructor_bio: null,
  price: 125,
  price_original: null,
  image: null,
  fecha_inicio: '2026-08-01',
  fecha_fin: '2026-09-15',
  horario: 'Sábados',
  ubicacion: 'San Salvador',
  departamento: null,
  municipio: null,
  lat: null,
  lng: null,
  cupo_maximo: 20,
  inscritos: 0,
  estado: 'enrolling',
  tags: null,
  public_enrollment_token: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const context = { cookies: {}, params: { id: '9' } } as unknown as Parameters<typeof POST>[0];

describe('POST /api/courses/[id]/public-link', () => {
  beforeEach(() => {
    delete process.env.PUBLIC_SITE_URL;
    getCurrentUserMock.mockReset();
    canViewCoursesMock.mockReset();
    getCourseByIdMock.mockReset();
    queryMock.mockReset();
    generateCourseEnrollmentTokenMock.mockReset();
    getCurrentUserMock.mockResolvedValue({ id: 1, role: 'admin', email: 'admin@acoes.local' });
    canViewCoursesMock.mockReturnValue(true);
    getCourseByIdMock.mockResolvedValue(baseCourse);
    generateCourseEnrollmentTokenMock.mockReturnValue('9-maria-elena-menjivar-abc12345');
    queryMock.mockResolvedValue({ rows: [{ public_enrollment_token: '9-maria-elena-menjivar-abc12345' }] });
  });

  it('generates a URL that points to the SPA with the hash and the token', async () => {
    const response = await POST(context);
    expect(response.status).toBe(200);

    const body = (await response.json()) as { data: { token: string; publicUrl: string } };
    expect(body.data.token).toBe('9-maria-elena-menjivar-abc12345');
    expect(body.data.publicUrl).toContain('#/cursos/9');
    expect(body.data.publicUrl).toContain('?token=9-maria-elena-menjivar-abc12345');
    expect(body.data.publicUrl).toContain(':4321');
  });

  it('starts with the unified Astro origin', async () => {
    const response = await POST(context);
    const body = (await response.json()) as { data: { publicUrl: string } };
    expect(body.data.publicUrl.startsWith('http://localhost:4321/')).toBe(true);
  });

  it('returns a parseable URL whose origin matches the public site base', async () => {
    const response = await POST(context);
    const body = (await response.json()) as { data: { publicUrl: string } };
    const parsed = new URL(body.data.publicUrl);
    expect(parsed.origin).toBe('http://localhost:4321');
    expect(parsed.pathname).toBe('/');
    expect(parsed.hash).toBe('#/cursos/9?token=9-maria-elena-menjivar-abc12345');
  });

  it('encodes the token in the search params', async () => {
    getCourseByIdMock.mockResolvedValue({ ...baseCourse, public_enrollment_token: 'tok en+with/special&chars' });
    queryMock.mockResolvedValue({ rows: [{ public_enrollment_token: 'tok en+with/special&chars' }] });

    const response = await POST(context);
    const body = (await response.json()) as { data: { publicUrl: string; token: string } };
    expect(body.data.token).toBe('tok en+with/special&chars');
    // The raw token must not appear unencoded in the URL (special chars must be encoded).
    expect(body.data.publicUrl).not.toContain('tok en+with/special&chars');
    const parsed = new URL(body.data.publicUrl);
    // URLSearchParams.toString() uses form-encoding (+ for space, %2B for +, %2F for /, %26 for &).
    expect(parsed.hash).toContain('tok+en%2Bwith%2Fspecial%26chars');
  });

  it('uses PUBLIC_SITE_URL when provided instead of the default', async () => {
    process.env.PUBLIC_SITE_URL = 'https://cursos.example.com';
    const response = await POST(context);
    const body = (await response.json()) as { data: { publicUrl: string } };
    expect(body.data.publicUrl.startsWith('https://cursos.example.com/#/cursos/9')).toBe(true);
  });

  it('returns 401 when there is no authenticated user', async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const response = await POST(context);
    expect(response.status).toBe(401);
  });

  it('returns 403 when the user cannot view courses', async () => {
    canViewCoursesMock.mockReturnValue(false);
    const response = await POST(context);
    expect(response.status).toBe(403);
  });

  it('returns 400 for a non-numeric course id', async () => {
    const response = await POST({ ...context, params: { id: 'not-a-number' } } as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);
  });

  it('returns 404 when the course does not exist', async () => {
    getCourseByIdMock.mockResolvedValue(null);
    const response = await POST(context);
    expect(response.status).toBe(404);
  });

  it('returns 500 if the database update fails', async () => {
    queryMock.mockRejectedValue(new Error('connection refused'));
    const response = await POST(context);
    expect(response.status).toBe(500);
    const body = (await response.json()) as { error: string };
    // The token must not leak into the error response.
    expect(body.error).not.toContain('abc12345');
  });

  it('returns 500 if the token is empty after persistence', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    generateCourseEnrollmentTokenMock.mockReturnValue('');
    const response = await POST(context);
    expect(response.status).toBe(500);
  });
});
