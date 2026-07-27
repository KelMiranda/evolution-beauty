import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  ensureDatabaseMock,
  findParticipantDuplicatesMock,
  createParticipantMock,
  createNotificationMock,
  verifyTurnstileTokenMock,
} = vi.hoisted(() => ({
  ensureDatabaseMock: vi.fn(),
  findParticipantDuplicatesMock: vi.fn(),
  createParticipantMock: vi.fn(),
  createNotificationMock: vi.fn(),
  verifyTurnstileTokenMock: vi.fn(),
}));

vi.mock('../bootstrap', () => ({ ensureDatabase: ensureDatabaseMock }));
vi.mock('../participants', () => ({
  findParticipantDuplicates: findParticipantDuplicatesMock,
  createParticipant: createParticipantMock,
}));
vi.mock('../turnstile', () => ({ verifyTurnstileToken: verifyTurnstileTokenMock }));
vi.mock('../notifications', () => ({
  createNotification: createNotificationMock,
  notificationKinds: { duplicateInReview: 'duplicate_in_review' },
}));

import { POST } from '../../../pages/api/public/participants';

const baseValidPayload = {
  courseId: 9,
  fullName: 'Ana Test',
  documentNumber: '71234567-8',
  birthDate: '1995-05-20',
  gender: 'Femenino',
  phoneCountry: 'El Salvador',
  phoneDialCode: '+503',
  phoneNumber: '7000-0001',
  phone: '+503 7000-0001',
  email: 'ana.test@example.com',
  address: 'Colonia Escalon',
  municipality: 'San Salvador',
  department: 'San Salvador',
  district: 'San Salvador',
  organization: 'Test Org',
  roleFunction: 'Participante',
  educationLevel: '',
  program: 'Prueba E2E',
  status: 'Pendiente',
  notes: '',
  consent: true,
};

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/public/participants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/public/participants (JSON branch)', () => {
  beforeEach(() => {
    ensureDatabaseMock.mockReset().mockResolvedValue(undefined);
    findParticipantDuplicatesMock.mockReset().mockResolvedValue([]);
    createParticipantMock.mockReset();
    createNotificationMock.mockReset();
    verifyTurnstileTokenMock.mockReset().mockResolvedValue({ ok: true });
  });

  it('returns HTTP 400 before persistence when Turnstile rejects the token', async () => {
    verifyTurnstileTokenMock.mockResolvedValue({ ok: false, reason: 'Falta el token de Turnstile' });

    const response = await POST({ request: makeRequest(baseValidPayload) } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'turnstile_failed',
      message: 'Falta el token de Turnstile',
    });
    expect(createParticipantMock).not.toHaveBeenCalled();
  });

  it('passes the JSON token and Cloudflare client IP to Turnstile verification', async () => {
    createParticipantMock.mockResolvedValue({ id: 42, participant_code: 'ACOES-2026-0001' });
    const request = new Request('http://localhost/api/public/participants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'cf-connecting-ip': '203.0.113.2',
      },
      body: JSON.stringify({ ...baseValidPayload, turnstileToken: 'verified-token' }),
    });

    const response = await POST({ request } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(201);
    expect(verifyTurnstileTokenMock).toHaveBeenCalledWith('verified-token', '203.0.113.2');
  });

  it('returns HTTP 400 with per-field Zod issues when gender is invalid', async () => {
    const response = await POST({ request: makeRequest({ gender: 'Otro' }) } as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);

    const body = (await response.json()) as { error: string; issues: Array<{ path: (string | number)[]; message: string }> };
    expect(body.error).toBe('validation_failed');
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues.length).toBeGreaterThan(0);
    const genderIssue = body.issues.find((issue) => issue.path[0] === 'gender');
    expect(genderIssue).toBeDefined();
    expect(createParticipantMock).not.toHaveBeenCalled();
  });

  it('returns HTTP 400 with multiple issues when many fields are invalid', async () => {
    const response = await POST({
      request: makeRequest({
        gender: 'Otro',
        // missing required fields (fullName, documentNumber, birthDate, phone* etc.)
        // + invalid phone number that is too short to satisfy the .min(5) constraint
        phone: '1',
        roleFunction: 'NotAValidFunction',
        // department/municipality that fail the superRefine catalog checks
        department: 'NotAValidDepartment',
        municipality: 'NotAValidMunicipality',
      }),
    } as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);

    const body = (await response.json()) as { error: string; issues: Array<{ path: (string | number)[] }> };
    expect(body.error).toBe('validation_failed');
    const paths = body.issues.map((issue) => issue.path[0]);
    expect(paths).toContain('gender');
    expect(paths).toContain('roleFunction');
    expect(body.issues.length).toBeGreaterThanOrEqual(3);
    expect(createParticipantMock).not.toHaveBeenCalled();
  });

  it('returns HTTP 201 when the payload is valid', async () => {
    createParticipantMock.mockResolvedValue({ id: 42, participant_code: 'ACOES-2026-0001' });

    const response = await POST({ request: makeRequest(baseValidPayload) } as Parameters<typeof POST>[0]);
    expect(response.status).toBe(201);

    const body = (await response.json()) as { data: { id: number; participant_code: string } };
    expect(body.data).toBeDefined();
    expect(body.data.id).toBe(42);
    expect(createParticipantMock).toHaveBeenCalledTimes(1);
    expect(createNotificationMock).not.toHaveBeenCalled();
  });

  it('accepts snake_case aliases for the public E2E payload shape', async () => {
    createParticipantMock.mockResolvedValue({ id: 7, participant_code: 'ACOES-2026-0007' });

    const snakePayload = {
      course_id: 9,
      full_name: 'Ana Test',
      document_number: '81234567-9',
      birth_date: '1995-05-20',
      gender: 'Femenino',
      phone_country: 'El Salvador',
      phone_dial_code: '+503',
      phone_number: '7000-0002',
      phone: '+503 7000-0002',
      email: 'ana.snake@example.com',
      address: 'Colonia Escalon',
      municipality: 'San Salvador',
      department: 'San Salvador',
      district: 'San Salvador',
      organization: 'Test Org',
      role_function: 'Participante',
      education_level: '',
      program: 'Prueba E2E',
      status: 'Pendiente',
      notes: '',
      consent: true,
    };
    const response = await POST({ request: makeRequest(snakePayload) } as Parameters<typeof POST>[0]);
    expect(response.status).toBe(201);
    expect(createParticipantMock).toHaveBeenCalledTimes(1);
  });

  it('does not return HTTP 500 on any validation failure', async () => {
    const response = await POST({
      request: makeRequest({ gender: 'Otro', fullName: 'X' }),
    } as Parameters<typeof POST>[0]);
    expect(response.status).not.toBe(500);
    expect(response.status).toBe(400);
  });

  it('rejects roleFunction: Empleado on the public path with a per-field issue on roleFunction', async () => {
    const response = await POST({
      request: makeRequest({ ...baseValidPayload, roleFunction: 'Empleado' }),
    } as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);

    const body = (await response.json()) as { error: string; issues: Array<{ path: (string | number)[]; message: string }> };
    expect(body.error).toBe('validation_failed');
    const roleIssue = body.issues.find((issue) => issue.path[0] === 'roleFunction');
    expect(roleIssue).toBeDefined();
    expect(createParticipantMock).not.toHaveBeenCalled();
  });

  it('rejects roleFunction: Otro on the public path with a per-field issue on roleFunction', async () => {
    const response = await POST({
      request: makeRequest({ ...baseValidPayload, roleFunction: 'Otro' }),
    } as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);
    expect(createParticipantMock).not.toHaveBeenCalled();
  });

  it('accepts roleFunction: Participante and returns 201', async () => {
    createParticipantMock.mockResolvedValue({ id: 99, participant_code: 'ACOES-2026-0099' });

    const response = await POST({
      request: makeRequest({ ...baseValidPayload, roleFunction: 'Participante' }),
    } as Parameters<typeof POST>[0]);
    expect(response.status).toBe(201);
    expect(createParticipantMock).toHaveBeenCalledTimes(1);
  });

  it('normalizes a nine-digit DUI to the canonical form before persistence', async () => {
    createParticipantMock.mockResolvedValue({ id: 100, participant_code: 'ACOES-2026-0100' });

    const response = await POST({
      request: makeRequest({ ...baseValidPayload, roleFunction: 'Participante', documentNumber: '123456789' }),
    } as Parameters<typeof POST>[0]);
    expect(response.status).toBe(201);

    const createArgs = createParticipantMock.mock.calls[0]?.[0] as { documentNumber: string };
    expect(createArgs.documentNumber).toBe('12345678-9');
  });

  it('rejects a malformed DUI with a per-field error on documentNumber', async () => {
    const response = await POST({
      request: makeRequest({ ...baseValidPayload, roleFunction: 'Participante', documentNumber: '1234' }),
    } as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);
    expect(createParticipantMock).not.toHaveBeenCalled();
  });

  it('rejects a non-empty notes value on the public path', async () => {
    const response = await POST({
      request: makeRequest({ ...baseValidPayload, roleFunction: 'Participante', notes: 'something' }),
    } as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);
    expect(createParticipantMock).not.toHaveBeenCalled();
  });

  it('never forwards a notes field to createParticipant, even when notes is empty', async () => {
    createParticipantMock.mockResolvedValue({ id: 101, participant_code: 'ACOES-2026-0101' });

    await POST({
      request: makeRequest({ ...baseValidPayload, roleFunction: 'Participante', notes: '' }),
    } as Parameters<typeof POST>[0]);

    const createArgs = createParticipantMock.mock.calls[0]?.[0] as { notes: unknown };
    expect(createArgs.notes).toBeUndefined();
  });

  it('synthesizes the combined phone from phone_dial_code + phone_number when the wire payload omits it', async () => {
    createParticipantMock.mockResolvedValue({ id: 200, participant_code: 'ACOES-2026-0200' });

    // Strip the explicit `phone` key — the public schema's preprocess should
    // synthesize it before the underlying validator runs.
    const payloadWithoutPhone = { ...baseValidPayload, roleFunction: 'Participante' };
    delete (payloadWithoutPhone as Record<string, unknown>).phone;

    const response = await POST({
      request: makeRequest(payloadWithoutPhone),
    } as Parameters<typeof POST>[0]);
    expect(response.status).toBe(201);

    const createArgs = createParticipantMock.mock.calls[0]?.[0] as { phone: string };
    expect(createArgs.phone).toBe('+503 7000-0001');
  });

  it('does NOT crash the route handler when both phone and phone_number are missing', async () => {
    // Strip both camelCase and snake_case aliases so the route handler's
    // `pickString` fallbacks return `''` — the schema preprocess must then
    // surface a 400 with a clear `phoneNumber` / `phone` issue instead of
    // passing an empty phone through to `createParticipant`.
    const payloadWithoutPhone = { ...baseValidPayload, roleFunction: 'Participante' };
    delete (payloadWithoutPhone as Record<string, unknown>).phone;
    delete (payloadWithoutPhone as Record<string, unknown>).phone_number;
    (payloadWithoutPhone as Record<string, unknown>).phoneNumber = '';

    const response = await POST({
      request: makeRequest(payloadWithoutPhone),
    } as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);

    const body = (await response.json()) as { error: string; issues: Array<{ path: (string | number)[] }> };
    expect(body.error).toBe('validation_failed');
    const phonePaths = body.issues.map((issue) => issue.path[0]).filter((p) => p === 'phoneNumber');
    expect(phonePaths.length).toBeGreaterThan(0);
  });
});
