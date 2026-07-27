import { describe, expect, it } from 'vitest';

import { participantRoleFunctionOptions, PUBLIC_PARTICIPANT_ROLE_OPTIONS } from '../catalogs';
import { publicParticipantSubmissionSchema } from '../public-participant-schema';

const baseValidPayload = {
  fullName: 'Ana Test',
  documentNumber: '12345678-9',
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
  educationLevel: 'Universitario',
  status: 'Pendiente',
  consent: true,
};

describe('public participant schema', () => {
  it('accepts a valid Participante payload with canonical DUI', () => {
    const result = publicParticipantSubmissionSchema.safeParse(baseValidPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.roleFunction).toBe('Participante');
      expect(result.data.documentNumber).toBe('12345678-9');
    }
  });

  it('accepts a valid Facilitador payload with courseId and program', () => {
    const result = publicParticipantSubmissionSchema.safeParse({
      ...baseValidPayload,
      roleFunction: 'Facilitador',
      courseId: 9,
      program: 'Capacitación en estilismo',
    });
    expect(result.success).toBe(true);
  });

  it('rejects Empleado with a per-field issue on roleFunction', () => {
    const result = publicParticipantSubmissionSchema.safeParse({
      ...baseValidPayload,
      roleFunction: 'Empleado',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const roleIssue = result.error.issues.find((issue) => issue.path[0] === 'roleFunction');
      expect(roleIssue).toBeDefined();
      expect(roleIssue?.message).toContain('Solo se permite');
    }
  });

  it('rejects Otro with a per-field issue on roleFunction', () => {
    const result = publicParticipantSubmissionSchema.safeParse({
      ...baseValidPayload,
      roleFunction: 'Otro',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const roleIssue = result.error.issues.find((issue) => issue.path[0] === 'roleFunction');
      expect(roleIssue).toBeDefined();
    }
  });

  it('rejects the historical Facilitadora string on the public path', () => {
    const result = publicParticipantSubmissionSchema.safeParse({
      ...baseValidPayload,
      roleFunction: 'Facilitadora',
    });
    expect(result.success).toBe(false);
  });

  it('rejects Facilitador without courseId', () => {
    const result = publicParticipantSubmissionSchema.safeParse({
      ...baseValidPayload,
      roleFunction: 'Facilitador',
      program: 'Capacitación',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const courseIssue = result.error.issues.find((issue) => issue.path[0] === 'courseId');
      expect(courseIssue).toBeDefined();
      expect(courseIssue?.message).toContain('curso');
    }
  });

  it('rejects Facilitador without program', () => {
    const result = publicParticipantSubmissionSchema.safeParse({
      ...baseValidPayload,
      roleFunction: 'Facilitador',
      courseId: 9,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const programIssue = result.error.issues.find((issue) => issue.path[0] === 'program');
      expect(programIssue).toBeDefined();
      expect(programIssue?.message).toContain('capacitación');
    }
  });

  it('rejects a public payload that includes a non-empty notes value', () => {
    const result = publicParticipantSubmissionSchema.safeParse({
      ...baseValidPayload,
      notes: 'Should not be allowed on the public surface',
    });
    expect(result.success).toBe(false);
  });

  it('accepts an empty-string notes field (back-compat) but transforms it to undefined', () => {
    const result = publicParticipantSubmissionSchema.safeParse({
      ...baseValidPayload,
      notes: '',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.notes).toBeUndefined();
  });

  it('normalizes a nine-digit DUI to the canonical form', () => {
    const result = publicParticipantSubmissionSchema.safeParse({
      ...baseValidPayload,
      documentNumber: '123456789',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.documentNumber).toBe('12345678-9');
  });

  it('rejects a malformed DUI with a per-field error', () => {
    const result = publicParticipantSubmissionSchema.safeParse({
      ...baseValidPayload,
      documentNumber: '1234',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const duiIssue = result.error.issues.find((issue) => issue.path[0] === 'documentNumber');
      expect(duiIssue).toBeDefined();
    }
  });

  it('does not require courseId/program for Participante', () => {
    const result = publicParticipantSubmissionSchema.safeParse({
      ...baseValidPayload,
      roleFunction: 'Participante',
    });
    expect(result.success).toBe(true);
  });
});

describe('public participant schema — phone preprocess', () => {
  const baseWithoutPhone = {
    fullName: 'Ana Sin Telefono',
    documentNumber: '12345678-9',
    birthDate: '1995-05-20',
    gender: 'Femenino',
    phoneCountry: 'El Salvador',
    phoneDialCode: '+503',
    phoneNumber: '7000-9999',
    email: 'ana.sintlf@example.com',
    address: 'Colonia Escalon',
    municipality: 'San Salvador',
    department: 'San Salvador',
    district: 'San Salvador',
    organization: 'Test Org',
    roleFunction: 'Participante',
    educationLevel: '',
    status: 'Pendiente',
    consent: true,
  };

  it('synthesizes phone from phone_dial_code + phone_number when phone is omitted', () => {
    const result = publicParticipantSubmissionSchema.safeParse(baseWithoutPhone);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe('+503 7000-9999');
    }
  });

  it('synthesizes phone when phone is an empty string', () => {
    const result = publicParticipantSubmissionSchema.safeParse({
      ...baseWithoutPhone,
      phone: '',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe('+503 7000-9999');
    }
  });

  it('preserves a wire-supplied phone and ignores the prefijo/celular synthesis', () => {
    const result = publicParticipantSubmissionSchema.safeParse({
      ...baseWithoutPhone,
      phone: '+503 7000-9999',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe('+503 7000-9999');
    }
  });

  it('rejects a payload where both phone is missing and phone_number is too short', () => {
    const result = publicParticipantSubmissionSchema.safeParse({
      ...baseWithoutPhone,
      phone: undefined,
      phoneNumber: '1',
    });
    expect(result.success).toBe(false);
  });

  it('strips whitespace around phone_dial_code when synthesizing', () => {
    const result = publicParticipantSubmissionSchema.safeParse({
      ...baseWithoutPhone,
      phone_dial_code: '  +503  ',
      phoneNumber: '7000-9999',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe('+503 7000-9999');
    }
  });
});

describe('public participant schema — courseId tightening', () => {
  // Participante does not require courseId; the tightened preprocess must
  // accept missing values without producing a NaN-induced error.
  const baseParticipante = {
    fullName: 'Ana Sin Curso',
    documentNumber: '12345678-9',
    birthDate: '1995-05-20',
    gender: 'Femenino',
    phoneCountry: 'El Salvador',
    phoneDialCode: '+503',
    phoneNumber: '7000-0000',
    phone: '+503 7000-0000',
    email: 'ana.sincurs@example.com',
    address: 'Colonia Escalon',
    municipality: 'San Salvador',
    department: 'San Salvador',
    district: '',
    organization: 'Test Org',
    roleFunction: 'Participante',
    educationLevel: '',
    status: 'Pendiente',
    notes: '',
    consent: true,
  };

  it('accepts an undefined courseId without surfacing a NaN error', () => {
    const result = publicParticipantSubmissionSchema.safeParse(baseParticipante);
    expect(result.success).toBe(true);
  });

  it('accepts an empty-string courseId without surfacing a NaN error', () => {
    const result = publicParticipantSubmissionSchema.safeParse({
      ...baseParticipante,
      courseId: '',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a numeric courseId as-is', () => {
    const result = publicParticipantSubmissionSchema.safeParse({
      ...baseParticipante,
      courseId: 26,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.courseId).toBe(26);
  });

  it('coerces a string-numeric courseId', () => {
    const result = publicParticipantSubmissionSchema.safeParse({
      ...baseParticipante,
      courseId: '26',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.courseId).toBe(26);
  });

  it('rejects a negative courseId', () => {
    const result = publicParticipantSubmissionSchema.safeParse({
      ...baseParticipante,
      courseId: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-numeric courseId without producing a NaN error', () => {
    const result = publicParticipantSubmissionSchema.safeParse({
      ...baseParticipante,
      courseId: 'banana',
    });
    expect(result.success).toBe(false);
  });
});

describe('public vs admin catalogs are independent', () => {
  it('exposes a public two-value list and a separate admin four-value list', () => {
    expect(PUBLIC_PARTICIPANT_ROLE_OPTIONS).toEqual(['Participante', 'Facilitador']);
    expect(participantRoleFunctionOptions).toContain('Empleado');
    expect(participantRoleFunctionOptions).toContain('Otro');
    expect(participantRoleFunctionOptions).toContain('Facilitador');
    expect(participantRoleFunctionOptions).toContain('Participante');
    expect(participantRoleFunctionOptions.length).toBe(4);
  });

  it('the public schema rejects every value that is not in the public catalog', () => {
    const publicAllowed = new Set<string>(PUBLIC_PARTICIPANT_ROLE_OPTIONS);
    for (const candidate of participantRoleFunctionOptions) {
      if (!publicAllowed.has(candidate)) {
        const result = publicParticipantSubmissionSchema.safeParse({
          ...baseValidPayload,
          roleFunction: candidate,
        });
        expect(result.success).toBe(false);
      }
    }
  });
});
