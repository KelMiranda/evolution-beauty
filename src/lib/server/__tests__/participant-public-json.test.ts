import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  ensureDatabaseMock,
  findParticipantDuplicatesMock,
  createParticipantMock,
  createNotificationMock,
} = vi.hoisted(() => ({
  ensureDatabaseMock: vi.fn(),
  findParticipantDuplicatesMock: vi.fn(),
  createParticipantMock: vi.fn(),
  createNotificationMock: vi.fn(),
}));

vi.mock('../bootstrap', () => ({ ensureDatabase: ensureDatabaseMock }));
vi.mock('../participants', () => ({
  findParticipantDuplicates: findParticipantDuplicatesMock,
  createParticipant: createParticipantMock,
}));
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
  roleFunction: 'Empleado',
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
      role_function: 'Empleado',
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
});
