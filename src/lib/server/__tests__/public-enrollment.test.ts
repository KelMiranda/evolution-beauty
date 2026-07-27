import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  ensureDatabaseMock,
  createEnrollmentMock,
  getParticipantByDocumentNumberMock,
  getCourseByPublicEnrollmentTokenMock,
  normalizeDuiMock,
} = vi.hoisted(() => ({
  ensureDatabaseMock: vi.fn(),
  createEnrollmentMock: vi.fn(),
  getParticipantByDocumentNumberMock: vi.fn(),
  getCourseByPublicEnrollmentTokenMock: vi.fn(),
  normalizeDuiMock: vi.fn((v: unknown) => {
    if (typeof v !== 'string') return null;
    const t = v.replace(/\s+/g, '');
    if (/^\d{8}-\d$/.test(t)) return t;
    if (/^\d{9}$/.test(t)) return `${t.slice(0, 8)}-${t.slice(8)}`;
    return null;
  }),
}));

vi.mock('../bootstrap', () => ({ ensureDatabase: ensureDatabaseMock }));
vi.mock('../enrollments', () => ({ createEnrollment: createEnrollmentMock }));
vi.mock('../participants', () => ({ getParticipantByDocumentNumber: getParticipantByDocumentNumberMock }));
vi.mock('../courses', () => ({ getCourseByPublicEnrollmentToken: getCourseByPublicEnrollmentTokenMock }));
vi.mock('../dui', () => ({
  normalizeDui: normalizeDuiMock,
  duiSchema: {
    safeParse: (v: unknown) => {
      const normalized = normalizeDuiMock(v);
      if (!normalized) {
        return {
          success: false,
          error: {
            flatten: () => ({ fieldErrors: { dui: ['DUI inválido (formato 00000000-0)'] } }),
          },
        };
      }
      return { success: true, data: normalized };
    },
  },
}));

import { POST as publicPost } from '../../../pages/api/public/enrollments';

function makeRequest(body: unknown, contentType = 'application/json'): Request {
  return new Request('http://localhost/api/public/enrollments', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const fakeCourse = {
  id: 9,
  cupo_maximo: 20,
  inscritos: 0,
  estado: 'enrolling',
  facilitator_id: null,
  public_enrollment_token: 'tok-9-abc',
} as unknown as Awaited<ReturnType<typeof getCourseByPublicEnrollmentTokenMock>>;

describe('POST /api/public/enrollments — public-enrollment-by-dui contract', () => {
  beforeEach(() => {
    ensureDatabaseMock.mockReset().mockResolvedValue(undefined);
    createEnrollmentMock.mockReset();
    getParticipantByDocumentNumberMock.mockReset();
    getCourseByPublicEnrollmentTokenMock.mockReset().mockResolvedValue(fakeCourse);
    normalizeDuiMock.mockClear();
  });

  describe('found participant', () => {
    it('returns 201 with the linked enrollment and the participantId forwarded to createEnrollment', async () => {
      getParticipantByDocumentNumberMock.mockResolvedValue({ id: 99 });
      createEnrollmentMock.mockResolvedValue({ id: 5, participant_id: 99 });

      const response = await publicPost({
        request: makeRequest({ token: 'tok-9-abc', dui: '12345678-9' }),
      } as Parameters<typeof publicPost>[0]);

      expect(response.status).toBe(201);
      const body = (await response.json()) as { data?: { id: number; participant_id: number } };
      expect(body.data).toBeDefined();
      expect(body.data?.id).toBe(5);
      expect(body.data?.participant_id).toBe(99);

      const call = createEnrollmentMock.mock.calls[0]?.[0] as {
        courseId: number;
        participantId: number;
        publicToken: string;
        fullName?: string;
        email?: string;
        phone?: string;
      };
      expect(call.courseId).toBe(9);
      expect(call.participantId).toBe(99);
      expect(call.publicToken).toBe('tok-9-abc');
      // Legacy identity fields are NOT forwarded; createEnrollment derives
      // them from the participant row inside the transaction.
      expect(call.fullName).toBeUndefined();
      expect(call.email).toBeUndefined();
      expect(call.phone).toBeUndefined();
    });

    it('normalizes a dashless 9-digit DUI before lookup', async () => {
      getParticipantByDocumentNumberMock.mockResolvedValue({ id: 11 });
      createEnrollmentMock.mockResolvedValue({ id: 6, participant_id: 11 });

      const response = await publicPost({
        request: makeRequest({ token: 'tok-9-abc', dui: '123456789' }),
      } as Parameters<typeof publicPost>[0]);

      expect(response.status).toBe(201);
      // The lookup was called with the canonical form.
      expect(getParticipantByDocumentNumberMock).toHaveBeenCalledWith('12345678-9');
    });
  });

  describe('not-found participant', () => {
    it('returns 200 with the encoded /registro redirect', async () => {
      getParticipantByDocumentNumberMock.mockResolvedValue(null);

      const response = await publicPost({
        request: makeRequest({ token: 'tok-9-abc', dui: '12345678-9' }),
      } as Parameters<typeof publicPost>[0]);

      expect(response.status).toBe(200);
      const body = (await response.json()) as { redirect?: string };
      expect(body.redirect).toBe(
        `/registro?redirect=${encodeURIComponent('/cursos/9?token=tok-9-abc')}`,
      );
      expect(createEnrollmentMock).not.toHaveBeenCalled();
    });

    it('does NOT create a participant row when the DUI is unknown', async () => {
      getParticipantByDocumentNumberMock.mockResolvedValue(null);

      const response = await publicPost({
        request: makeRequest({ token: 'tok-9-abc', dui: '99999999-9' }),
      } as Parameters<typeof publicPost>[0]);

      expect(response.status).toBe(200);
      expect(createEnrollmentMock).not.toHaveBeenCalled();
    });

    it('embeds the courseId and token in the inner redirect path', async () => {
      getCourseByPublicEnrollmentTokenMock.mockResolvedValue({
        ...fakeCourse,
        id: 42,
        public_enrollment_token: 'tok-42-xyz',
      } as unknown as Awaited<ReturnType<typeof getCourseByPublicEnrollmentTokenMock>>);
      getParticipantByDocumentNumberMock.mockResolvedValue(null);

      const response = await publicPost({
        request: makeRequest({ token: 'tok-42-xyz', dui: '12345678-9' }),
      } as Parameters<typeof publicPost>[0]);

      expect(response.status).toBe(200);
      const body = (await response.json()) as { redirect?: string };
      const inner = decodeURIComponent(
        (body.redirect ?? '').split('redirect=')[1] ?? '',
      );
      expect(inner).toBe('/cursos/42?token=tok-42-xyz');
    });
  });

  describe('invalid token', () => {
    it('returns 404 when the token does not resolve to a course', async () => {
      getCourseByPublicEnrollmentTokenMock.mockResolvedValue(null);

      const response = await publicPost({
        request: makeRequest({ token: 'bogus', dui: '12345678-9' }),
      } as Parameters<typeof publicPost>[0]);

      expect(response.status).toBe(404);
      const body = (await response.json()) as { error?: string };
      expect(body.error).toMatch(/enlace público/i);
      expect(getParticipantByDocumentNumberMock).not.toHaveBeenCalled();
      expect(createEnrollmentMock).not.toHaveBeenCalled();
    });

    it('returns 404 when the token is empty', async () => {
      getCourseByPublicEnrollmentTokenMock.mockResolvedValue(null);

      const response = await publicPost({
        request: makeRequest({ token: '', dui: '12345678-9' }),
      } as Parameters<typeof publicPost>[0]);

      expect(response.status).toBe(404);
      expect(createEnrollmentMock).not.toHaveBeenCalled();
    });
  });

  describe('malformed DUI', () => {
    it('returns 400 when the DUI is too short', async () => {
      const response = await publicPost({
        request: makeRequest({ token: 'tok-9-abc', dui: '1234' }),
      } as Parameters<typeof publicPost>[0]);

      expect(response.status).toBe(400);
      expect(createEnrollmentMock).not.toHaveBeenCalled();
    });

    it('returns 400 when the DUI carries letters', async () => {
      const response = await publicPost({
        request: makeRequest({ token: 'tok-9-abc', dui: '12345678a' }),
      } as Parameters<typeof publicPost>[0]);

      expect(response.status).toBe(400);
      expect(createEnrollmentMock).not.toHaveBeenCalled();
    });

    it('returns 400 when the DUI is missing entirely', async () => {
      const response = await publicPost({
        request: makeRequest({ token: 'tok-9-abc' }),
      } as Parameters<typeof publicPost>[0]);

      expect(response.status).toBe(400);
      expect(createEnrollmentMock).not.toHaveBeenCalled();
    });

    it('does NOT perform a participant lookup on malformed DUI', async () => {
      await publicPost({
        request: makeRequest({ token: 'tok-9-abc', dui: 'not-a-dui' }),
      } as Parameters<typeof publicPost>[0]);

      expect(getParticipantByDocumentNumberMock).not.toHaveBeenCalled();
    });
  });

  describe('createEnrollment errors', () => {
    it('returns 409 when the course is full', async () => {
      getParticipantByDocumentNumberMock.mockResolvedValue({ id: 99 });
      createEnrollmentMock.mockRejectedValue(new Error('El curso ha alcanzado su cupo máximo'));

      const response = await publicPost({
        request: makeRequest({ token: 'tok-9-abc', dui: '12345678-9' }),
      } as Parameters<typeof publicPost>[0]);

      expect(response.status).toBe(409);
      const body = (await response.json()) as { error?: string };
      expect(body.error).toContain('cupo máximo');
    });

    it('returns 409 when the course is no longer available', async () => {
      getParticipantByDocumentNumberMock.mockResolvedValue({ id: 99 });
      createEnrollmentMock.mockRejectedValue(new Error('El curso no está disponible para inscripción'));

      const response = await publicPost({
        request: makeRequest({ token: 'tok-9-abc', dui: '12345678-9' }),
      } as Parameters<typeof publicPost>[0]);

      expect(response.status).toBe(409);
    });

    it('returns 400 for other createEnrollment errors', async () => {
      getParticipantByDocumentNumberMock.mockResolvedValue({ id: 99 });
      createEnrollmentMock.mockRejectedValue(new Error('unknown failure'));

      const response = await publicPost({
        request: makeRequest({ token: 'tok-9-abc', dui: '12345678-9' }),
      } as Parameters<typeof publicPost>[0]);

      expect(response.status).toBe(400);
    });
  });

  describe('contract', () => {
    it('does NOT accept legacy identity fields (fullName/email/phone)', async () => {
      getParticipantByDocumentNumberMock.mockResolvedValue(null);

      const response = await publicPost({
        request: makeRequest({
          token: 'tok-9-abc',
          dui: '12345678-9',
          fullName: 'Ana',
          email: 'ana@example.com',
          phone: '+503 7000-0000',
          notas: 'should-be-ignored',
        }),
      } as Parameters<typeof publicPost>[0]);

      // 200-with-redirect because the lookup is the only branch that
      // matters; extra fields are silently ignored.
      expect(response.status).toBe(200);
      expect(createEnrollmentMock).not.toHaveBeenCalled();
    });
  });
});