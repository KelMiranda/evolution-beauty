import { describe, expect, it, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../setup';
import { getDashboardStats } from '@/services/api';
import type { Participant, Course } from '@/services/api.backend.types';

/**
 * Dashboard stats regression coverage.
 *
 * PR2 normalized the canonical facilitator role to `Facilitador` (singular,
 * masculine-default). A previous version of `getDashboardStats` filtered on
 * `Facilitadora` / `facilitadora` (with the trailing `-a`), so the
 * Facilitadores stat card always rendered zero against the seeded data.
 *
 * These tests pin the filter so future stat refactors can't silently break
 * the count again.
 */
describe('getDashboardStats — role filters', () => {
  const baselineParticipant: Participant = {
    id: 1,
    participant_code: 'P000001',
    course_id: null,
    facilitator_id: null,
    full_name: 'Baseline Participant',
    document_number: '00000000-0',
    birth_date: '1990-01-01',
    gender: 'female',
    phone_country: 'SV',
    phone_dial_code: '+503',
    phone_number: '00000000',
    phone: '+503 0000 0000',
    email: 'baseline@example.com',
    address: null,
    municipality: null,
    department: 'San Salvador',
    district: null,
    organization: 'ACOES',
    role_function: 'Participante',
    education_level: null,
    program: null,
    status: 'active',
    lifecycle_state: 'active',
    deleted_at: null,
    deleted_by: null,
    notes: null,
    consent: true,
    created_by: 1,
    updated_by: 1,
    created_at: '2024-03-15T10:00:00Z',
    updated_at: '2024-03-15T10:00:00Z',
  };

  const baselineCourse: Course = {
    id: 1,
    name: 'Baseline Course',
    description: '',
    category: 'technology',
    level: 'beginner',
    facilitator_id: null,
    instructor: 'Test Instructor',
    instructor_bio: null,
    price: 0,
    price_original: null,
    image: null,
    fecha_inicio: '2024-01-01',
    fecha_fin: '2024-03-01',
    horario: '',
    ubicacion: 'Online',
    departamento: null,
    municipio: null,
    lat: null,
    lng: null,
    cupo_maximo: 20,
    inscritos: 5,
    estado: 'published',
    tags: null,
    public_enrollment_token: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  function withParticipants(payload: Participant[]) {
    return [
      http.get('/api/participants', () =>
        HttpResponse.json({
          data: payload,
          meta: { page: 1, limit: 1000, offset: 0, total: payload.length },
        })
      ),
      http.get('/api/courses', () => HttpResponse.json({ data: [baselineCourse] })),
      http.get('/api/enrollments', () => HttpResponse.json({ data: [] })),
    ];
  }

  beforeEach(() => {
    server.resetHandlers();
  });

  it('counts canonical "Facilitador" rows under facilitadores', async () => {
    server.use(
      ...withParticipants([
        baselineParticipant,
        { ...baselineParticipant, id: 2, full_name: 'Fac One', role_function: 'Facilitador' },
        { ...baselineParticipant, id: 3, full_name: 'Fac Two', role_function: 'Facilitador' },
      ])
    );

    const stats = await getDashboardStats();

    expect(stats.facilitadores).toBe(2);
    expect(stats.participantes).toBe(1);
    expect(stats.totalRegistros).toBe(3);
  });

  it('still counts lowercase "facilitador" rows (historical admin data)', async () => {
    server.use(
      ...withParticipants([
        { ...baselineParticipant, id: 2, full_name: 'Lower', role_function: 'facilitador' },
        { ...baselineParticipant, id: 3, full_name: 'Canonical', role_function: 'Facilitador' },
      ])
    );

    const stats = await getDashboardStats();

    expect(stats.facilitadores).toBe(2);
  });

  it('does NOT inflate facilitadores from the legacy "Facilitadora" spelling alone', async () => {
    // Without canonical "Facilitador" rows present, only the legacy
    // "Facilitadora" should still be ignored — the canonical form must
    // exist for the count to be non-zero. This pins the filter to the
    // singular masculine-default and prevents accidental regressions
    // back to the feminine variant.
    server.use(
      ...withParticipants([
        { ...baselineParticipant, id: 2, full_name: 'Legacy feminine', role_function: 'Facilitadora' },
      ])
    );

    const stats = await getDashboardStats();
    expect(stats.facilitadores).toBe(0);
  });

  it('builds porMes buckets from real created_at timestamps', async () => {
    server.use(
      ...withParticipants([
        { ...baselineParticipant, id: 2, full_name: 'March A', created_at: '2024-03-01T00:00:00Z' },
        { ...baselineParticipant, id: 3, full_name: 'March B', created_at: '2024-03-15T00:00:00Z' },
        { ...baselineParticipant, id: 4, full_name: 'May 1', created_at: '2024-05-01T00:00:00Z' },
      ])
    );

    const stats = await getDashboardStats();

    const march = stats.porMes.find(b => b.mes === 'Mar');
    const may = stats.porMes.find(b => b.mes === 'May');
    expect(march?.cantidad).toBe(2);
    expect(may?.cantidad).toBe(1);
  });
});
