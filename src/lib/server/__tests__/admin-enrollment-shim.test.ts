import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Admin enrollment shim coverage (PR4 housekeeping).
 *
 * The admin enrollment endpoint is a compatibility shim that resolves
 * a missing `participantId` by looking up the participant via the
 * canonicalized DUI. The PR1 baseline covered the happy path; PR4 adds
 * explicit coverage for:
 *
 *   • Admin creating an enrollment for a participant with the admin-only
 *     `Empleado` `role_function` (proves the admin shim does NOT inherit
 *     the public schema's two-value restriction).
 *   • Admin attempting to enroll a non-existing DUI (must return 400 with
 *     the clear Spanish error message and never call `createEnrollment`).
 *   • Admin creating with both `participantId` AND a mismatched DUI
 *     (must prefer the explicit `participantId`).
 *   • Admin requesting the full four-value catalog: `Empleado`,
 *     `Facilitador`, `Participante`, `Otro` (the admin path must accept
 *     all four even though the public path does not).
 *
 * See `openspec/changes/acoes-dui-enrollment-flow/specs/enrollments-participant-fk/spec.md`
 * and `openspec/changes/acoes-dui-enrollment-flow/specs/public-registration-enum-funcion/spec.md`.
 */

const {
  ensureDatabaseMock,
  getCurrentUserMock,
  createEnrollmentMock,
  getParticipantByDocumentNumberMock,
  normalizeDuiMock,
} = vi.hoisted(() => ({
  ensureDatabaseMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
  createEnrollmentMock: vi.fn(),
  getParticipantByDocumentNumberMock: vi.fn(),
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
vi.mock('../dui', () => ({
  normalizeDui: normalizeDuiMock,
}));

import { POST as adminPost } from '../../../pages/api/enrollments';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/enrollments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBaseBody = {
  courseId: 9,
  fullName: 'Empleada ACOES',
  email: 'empleada@example.com',
  phone: '+503 7000-0000',
  dui: '98765432-1',
};

describe('POST /api/enrollments (admin shim) — coverage matrix', () => {
  beforeEach(() => {
    ensureDatabaseMock.mockReset().mockResolvedValue(undefined);
    getCurrentUserMock.mockReset().mockResolvedValue({ id: 1, role: 'admin' });
    createEnrollmentMock.mockReset();
    getParticipantByDocumentNumberMock.mockReset();
  });

  it('creates an enrollment for a participant with admin-only funcion: Empleado', async () => {
    // The shim looks up the participant by DUI and forwards the
    // participantId. The participant's stored role_function does NOT
    // gate enrollment creation — admin still has the full catalog.
    getParticipantByDocumentNumberMock.mockResolvedValue({
      id: 555,
      role_function: 'Empleado',
    });
    createEnrollmentMock.mockResolvedValue({ id: 1, participant_id: 555 });

    const response = await adminPost({
      request: makeRequest(validBaseBody),
    } as Parameters<typeof adminPost>[0]);

    expect(response.status).toBe(201);
    const call = createEnrollmentMock.mock.calls[0]?.[0] as { participantId: number };
    expect(call.participantId).toBe(555);
  });

  it('creates an enrollment for a participant with the historical Facilitadora role string', async () => {
    // The DB column has no CHECK constraint, so historical records keep
    // `Facilitadora`. The admin path must accept them without rejection.
    getParticipantByDocumentNumberMock.mockResolvedValue({
      id: 556,
      role_function: 'Facilitadora',
    });
    createEnrollmentMock.mockResolvedValue({ id: 2, participant_id: 556 });

    const response = await adminPost({
      request: makeRequest(validBaseBody),
    } as Parameters<typeof adminPost>[0]);

    expect(response.status).toBe(201);
    const call = createEnrollmentMock.mock.calls[0]?.[0] as { participantId: number };
    expect(call.participantId).toBe(556);
  });

  it('returns 400 with a clear Spanish error when the DUI does not match any participant', async () => {
    getParticipantByDocumentNumberMock.mockResolvedValue(null);

    const response = await adminPost({
      request: makeRequest({
        ...validBaseBody,
        dui: '00000000-0',
      }),
    } as Parameters<typeof adminPost>[0]);

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/No existe un participante con ese DUI/);
    expect(body.error).toMatch(/Crealo primero desde el panel administrativo/);
    expect(createEnrollmentMock).not.toHaveBeenCalled();
  });

  it('returns 400 with a clear Spanish error when neither participantId nor a valid DUI is provided', async () => {
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
    expect(body.error).toMatch(/requiere participantId/);
    expect(createEnrollmentMock).not.toHaveBeenCalled();
  });

  it('prefers an explicit participantId over the DUI lookup', async () => {
    createEnrollmentMock.mockResolvedValue({ id: 3, participant_id: 7 });

    const response = await adminPost({
      request: makeRequest({
        courseId: 9,
        participantId: 7,
        fullName: 'Explicit ID',
        email: 'explicit@example.com',
        phone: '+503 7000-0000',
        // DUI is present but should be ignored when participantId is set.
        dui: '11111111-1',
      }),
    } as Parameters<typeof adminPost>[0]);

    expect(response.status).toBe(201);
    const call = createEnrollmentMock.mock.calls[0]?.[0] as { participantId: number };
    expect(call.participantId).toBe(7);
    expect(getParticipantByDocumentNumberMock).not.toHaveBeenCalled();
  });

  it('normalizes a 9-digit DUI before the participant lookup', async () => {
    getParticipantByDocumentNumberMock.mockResolvedValue({ id: 8 });
    createEnrollmentMock.mockResolvedValue({ id: 4, participant_id: 8 });

    const response = await adminPost({
      request: makeRequest({
        ...validBaseBody,
        dui: '987654321', // no dash
      }),
    } as Parameters<typeof adminPost>[0]);

    expect(response.status).toBe(201);
    expect(getParticipantByDocumentNumberMock).toHaveBeenCalledWith('98765432-1');
  });

  it('returns 400 when the normalized DUI is invalid (no participant lookup happens)', async () => {
    const response = await adminPost({
      request: makeRequest({
        ...validBaseBody,
        dui: 'not-a-dui',
      }),
    } as Parameters<typeof adminPost>[0]);

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/requiere participantId/);
    expect(getParticipantByDocumentNumberMock).not.toHaveBeenCalled();
    expect(createEnrollmentMock).not.toHaveBeenCalled();
  });

  it('returns 401 for anonymous callers and never reaches the participant lookup', async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const response = await adminPost({
      request: makeRequest(validBaseBody),
    } as Parameters<typeof adminPost>[0]);

    expect(response.status).toBe(401);
    expect(getParticipantByDocumentNumberMock).not.toHaveBeenCalled();
    expect(createEnrollmentMock).not.toHaveBeenCalled();
  });

  it('propagates a createEnrollment error with a 400 status', async () => {
    getParticipantByDocumentNumberMock.mockResolvedValue({ id: 9 });
    createEnrollmentMock.mockRejectedValue(new Error('Capo máximo alcanzado'));

    const response = await adminPost({
      request: makeRequest(validBaseBody),
    } as Parameters<typeof adminPost>[0]);

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/Capo máximo alcanzado/);
  });

  it('accepts the full admin four-value catalog when the participant record is returned', async () => {
    // The admin path's contract is independent of the public two-value
    // restriction. Verify the shim forwards the participantId regardless
    // of the stored `role_function`.
    const adminOnlyRoles = ['Empleado', 'Facilitador', 'Participante', 'Otro'] as const;
    let counter = 100;
    for (const role of adminOnlyRoles) {
      getParticipantByDocumentNumberMock.mockReset();
      getParticipantByDocumentNumberMock.mockResolvedValue({
        id: ++counter,
        role_function: role,
      });
      createEnrollmentMock.mockReset().mockResolvedValue({ id: counter, participant_id: counter });

      const response = await adminPost({
        request: makeRequest(validBaseBody),
      } as Parameters<typeof adminPost>[0]);

      expect(response.status, `admin path must accept role_function=${role}`).toBe(201);
      const call = createEnrollmentMock.mock.calls[0]?.[0] as { participantId: number };
      expect(call.participantId).toBe(counter);
    }
  });
});