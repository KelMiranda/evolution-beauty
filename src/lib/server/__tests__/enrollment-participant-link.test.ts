import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  ensureDatabaseMock,
  getCurrentUserMock,
  createEnrollmentMock,
  getParticipantByDocumentNumberMock,
  getCourseByPublicEnrollmentTokenMock,
  normalizeDuiMock,
} = vi.hoisted(() => ({
  ensureDatabaseMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
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
vi.mock('../auth', () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock('../enrollments', () => ({ createEnrollment: createEnrollmentMock }));
vi.mock('../participants', () => ({ getParticipantByDocumentNumber: getParticipantByDocumentNumberMock }));
vi.mock('../courses', () => ({ getCourseByPublicEnrollmentToken: getCourseByPublicEnrollmentTokenMock }));
vi.mock('../dui', () => ({
  normalizeDui: normalizeDuiMock,
  duiSchema: {
    safeParse: (v: unknown) => {
      const normalized = normalizeDuiMock(v);
      if (!normalized) return { success: false, error: { flatten: () => ({ fieldErrors: { dui: ['DUI inválido'] } }) } };
      return { success: true, data: normalized };
    },
  },
}));

import { POST as adminPost } from '../../../pages/api/enrollments';
import { POST as publicPost } from '../../../pages/api/public/enrollments';

function makeRequest(body: unknown, contentType = 'application/json'): Request {
  return new Request('http://localhost/api/enrollments', {
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

describe('POST /api/enrollments (admin shim) — participantId resolution', () => {
  beforeEach(() => {
    ensureDatabaseMock.mockReset().mockResolvedValue(undefined);
    getCurrentUserMock.mockReset().mockResolvedValue({ id: 1, role: 'admin' });
    createEnrollmentMock.mockReset();
    getParticipantByDocumentNumberMock.mockReset();
    normalizeDuiMock.mockClear();
  });

  it('returns 401 for anonymous callers', async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const response = await adminPost({
      request: makeRequest({ courseId: 9, fullName: 'X', email: 'x@x', phone: '+503 1', dui: '12345678-9' }),
    } as Parameters<typeof adminPost>[0]);
    expect(response.status).toBe(401);
    expect(createEnrollmentMock).not.toHaveBeenCalled();
  });

  it('returns 400 with a clear error when participantId is missing and DUI does not match a participant', async () => {
    getParticipantByDocumentNumberMock.mockResolvedValue(null);

    const response = await adminPost({
      request: makeRequest({
        courseId: 9,
        fullName: 'No Match',
        email: 'no@example.com',
        phone: '+503 7000-0000',
        dui: '12345678-9',
      }),
    } as Parameters<typeof adminPost>[0]);

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain('No existe un participante');
    expect(createEnrollmentMock).not.toHaveBeenCalled();
  });

  it('returns 400 with a clear error when neither participantId nor a valid DUI is provided', async () => {
    const response = await adminPost({
      request: makeRequest({
        courseId: 9,
        fullName: 'No DUI',
        email: 'no@example.com',
        phone: '+503 7000-0000',
      }),
    } as Parameters<typeof adminPost>[0]);

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain('requiere participantId');
    expect(createEnrollmentMock).not.toHaveBeenCalled();
  });

  it('resolves participantId from DUI and forwards it to createEnrollment', async () => {
    getParticipantByDocumentNumberMock.mockResolvedValue({ id: 42 });
    createEnrollmentMock.mockResolvedValue({ id: 1, participant_id: 42 });

    const response = await adminPost({
      request: makeRequest({
        courseId: 9,
        fullName: 'Ana Test',
        email: 'ana@example.com',
        phone: '+503 7000-0000',
        dui: '12345678-9',
      }),
    } as Parameters<typeof adminPost>[0]);

    expect(response.status).toBe(201);
    const call = createEnrollmentMock.mock.calls[0]?.[0] as { participantId: number };
    expect(call.participantId).toBe(42);
  });

  it('passes the provided participantId straight through to createEnrollment when present', async () => {
    createEnrollmentMock.mockResolvedValue({ id: 2, participant_id: 7 });

    const response = await adminPost({
      request: makeRequest({
        courseId: 9,
        participantId: 7,
        fullName: 'Ana Test',
        email: 'ana@example.com',
        phone: '+503 7000-0000',
      }),
    } as Parameters<typeof adminPost>[0]);

    expect(response.status).toBe(201);
    const call = createEnrollmentMock.mock.calls[0]?.[0] as { participantId: number };
    expect(call.participantId).toBe(7);
    expect(getParticipantByDocumentNumberMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/public/enrollments — DUI lookup', () => {
  beforeEach(() => {
    ensureDatabaseMock.mockReset().mockResolvedValue(undefined);
    createEnrollmentMock.mockReset();
    getParticipantByDocumentNumberMock.mockReset();
    getCourseByPublicEnrollmentTokenMock.mockReset();
    getCourseByPublicEnrollmentTokenMock.mockResolvedValue(fakeCourse);
  });

  it('returns 200 with the encoded registration redirect when no participant matches the DUI', async () => {
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

  it('returns 200 with redirect when the DUI is supplied without a dash', async () => {
    getParticipantByDocumentNumberMock.mockResolvedValue(null);

    const response = await publicPost({
      request: makeRequest({ token: 'tok-9-abc', dui: '123456789' }),
    } as Parameters<typeof publicPost>[0]);

    expect(response.status).toBe(200);
    const body = (await response.json()) as { redirect?: string };
    expect(body.redirect).toBe(
      `/registro?redirect=${encodeURIComponent('/cursos/9?token=tok-9-abc')}`,
    );
    expect(normalizeDuiMock).toHaveBeenCalled();
    expect(createEnrollmentMock).not.toHaveBeenCalled();
  });

  it('returns 400 when the DUI is malformed', async () => {
    const response = await publicPost({
      request: makeRequest({ token: 'tok-9-abc', dui: '1234' }),
    } as Parameters<typeof publicPost>[0]);

    expect(response.status).toBe(400);
    expect(createEnrollmentMock).not.toHaveBeenCalled();
  });

  it('returns 404 when the token is missing (no participant lookup happens)', async () => {
    getCourseByPublicEnrollmentTokenMock.mockResolvedValue(null);

    const response = await publicPost({
      request: makeRequest({ token: '', dui: '12345678-9' }),
    } as Parameters<typeof publicPost>[0]);

    expect(response.status).toBe(404);
    expect(getParticipantByDocumentNumberMock).not.toHaveBeenCalled();
  });

  it('returns 201 with the linked enrollment when the participant is found', async () => {
    getParticipantByDocumentNumberMock.mockResolvedValue({ id: 99 });
    createEnrollmentMock.mockResolvedValue({ id: 5, participant_id: 99 });

    const response = await publicPost({
      request: makeRequest({ token: 'tok-9-abc', dui: '12345678-9' }),
    } as Parameters<typeof publicPost>[0]);

    expect(response.status).toBe(201);
    const call = createEnrollmentMock.mock.calls[0]?.[0] as { participantId: number; publicToken: string; fullName?: string; email?: string; phone?: string };
    expect(call.participantId).toBe(99);
    expect(call.publicToken).toBe('tok-9-abc');
    // PR3 contract: the public path no longer carries the legacy identity
    // fields; createEnrollment derives them server-side from the participant.
    expect(call.fullName).toBeUndefined();
    expect(call.email).toBeUndefined();
    expect(call.phone).toBeUndefined();
  });
});
