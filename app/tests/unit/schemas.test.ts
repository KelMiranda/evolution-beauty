import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ─── Schemas (mirroring backend validation) ──────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const participantInputSchema = z.object({
  full_name: z.string().min(2).max(200),
  document_number: z.string().min(5).max(20),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
  phone_country: z.string().length(2).default('SV'),
  phone_dial_code: z.string().max(5).default('+503'),
  phone_number: z.string().min(8).max(15),
  email: z.string().email().nullable(),
  address: z.string().nullable(),
  municipality: z.string().nullable(),
  department: z.string().nullable(),
  district: z.string().nullable(),
  organization: z.string().nullable(),
  role_function: z.string().min(2),
  education_level: z.string().nullable(),
  program: z.string().nullable(),
  consent: z.boolean(),
});

export const courseInputSchema = z.object({
  name: z.string().min(2).max(300),
  description: z.string().nullable(),
  category: z.string().nullable(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).nullable(),
  instructor_name: z.string().min(2).max(200),
  instructor_bio: z.string().nullable(),
  max_capacity: z.number().int().min(1).max(100),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  location: z.string().nullable(),
});

export const enrollmentInputSchema = z.object({
  courseId: z.number().int().positive(),
  participant_id: z.number().int().positive().optional(),
  fullName: z.string().min(2).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(8).max(20).optional(),
  dui: z.string().max(20).optional(),
  notas: z.string().nullable().optional(),
});

export const userInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2).max(200),
  role: z.enum(['admin', 'facilitador', 'empleado', 'participante']),
  active: z.boolean(),
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Zod Schema Validation', () => {
  describe('loginSchema', () => {
    it('accepts valid credentials', () => {
      const result = loginSchema.safeParse({
        email: 'admin@acoes.local',
        password: 'Admin1234!',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'Admin1234!',
      });
      expect(result.success).toBe(false);
    });

    it('rejects short password', () => {
      const result = loginSchema.safeParse({
        email: 'admin@acoes.local',
        password: 'short',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing fields', () => {
      const result = loginSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('participantInputSchema', () => {
    const validParticipant = {
      full_name: 'Maria Garcia',
      document_number: '12345678-9',
      birth_date: '1990-05-15',
      gender: 'female' as const,
      phone_country: 'SV',
      phone_dial_code: '+503',
      phone_number: '12345678',
      email: 'maria@example.com',
      address: '123 Main St',
      municipality: 'San Salvador',
      department: 'San Salvador',
      district: 'Centro',
      organization: 'Test Org',
      role_function: 'teacher',
      education_level: 'bachillerato',
      program: 'Digital Skills',
      consent: true,
    };

    it('accepts valid participant', () => {
      const result = participantInputSchema.safeParse(validParticipant);
      expect(result.success).toBe(true);
    });

    it('accepts minimal participant with required fields only', () => {
      const minimal = {
        full_name: 'Juan Perez',
        document_number: '12345',
        birth_date: '1990-01-01',
        gender: 'male' as const,
        phone_country: 'SV',
        phone_dial_code: '+503',
        phone_number: '12345678',
        email: null,
        address: null,
        municipality: null,
        department: null,
        district: null,
        organization: null,
        role_function: 'teacher',
        education_level: null,
        program: null,
        consent: true,
      };
      const result = participantInputSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('rejects invalid gender', () => {
      const result = participantInputSchema.safeParse({
        ...validParticipant,
        gender: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid date format', () => {
      const result = participantInputSchema.safeParse({
        ...validParticipant,
        birth_date: '15-05-1990',
      });
      expect(result.success).toBe(false);
    });

    it('rejects too short full_name', () => {
      const result = participantInputSchema.safeParse({
        ...validParticipant,
        full_name: 'A',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email format', () => {
      const result = participantInputSchema.safeParse({
        ...validParticipant,
        email: 'not-email',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('courseInputSchema', () => {
    const validCourse = {
      name: 'Digital Skills 101',
      description: 'Learn digital skills',
      category: 'technology',
      level: 'beginner' as const,
      instructor_name: 'John Doe',
      instructor_bio: 'Experienced instructor',
      max_capacity: 20,
      start_date: '2024-01-01',
      end_date: '2024-03-01',
      location: 'Online',
    };

    it('accepts valid course', () => {
      const result = courseInputSchema.safeParse(validCourse);
      expect(result.success).toBe(true);
    });

    it('rejects invalid level', () => {
      const result = courseInputSchema.safeParse({
        ...validCourse,
        level: 'expert',
      });
      expect(result.success).toBe(false);
    });

    it('rejects max_capacity below 1', () => {
      const result = courseInputSchema.safeParse({
        ...validCourse,
        max_capacity: 0,
      });
      expect(result.success).toBe(false);
    });

    it('rejects max_capacity above 100', () => {
      const result = courseInputSchema.safeParse({
        ...validCourse,
        max_capacity: 150,
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid date format', () => {
      const result = courseInputSchema.safeParse({
        ...validCourse,
        start_date: '01/01/2024',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('enrollmentInputSchema', () => {
    it('accepts valid enrollment with courseId only', () => {
      const result = enrollmentInputSchema.safeParse({ courseId: 1 });
      expect(result.success).toBe(true);
    });

    it('accepts full enrollment data', () => {
      const result = enrollmentInputSchema.safeParse({
        courseId: 1,
        participant_id: 5,
        fullName: 'Maria Garcia',
        email: 'maria@example.com',
        phone: '+503 1234 5678',
        dui: '12345678-9',
        notas: 'Test notes',
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative courseId', () => {
      const result = enrollmentInputSchema.safeParse({ courseId: -1 });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email', () => {
      const result = enrollmentInputSchema.safeParse({
        courseId: 1,
        email: 'not-email',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('userInputSchema', () => {
    const validUser = {
      email: 'user@example.com',
      password: 'SecurePass123!',
      fullName: 'Test User',
      role: 'admin' as const,
      active: true,
    };

    it('accepts valid user', () => {
      const result = userInputSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('accepts all valid roles', () => {
      const roles = ['admin', 'facilitador', 'empleado', 'participante'] as const;
      for (const role of roles) {
        const result = userInputSchema.safeParse({ ...validUser, role });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid role', () => {
      const result = userInputSchema.safeParse({ ...validUser, role: 'superadmin' });
      expect(result.success).toBe(false);
    });

    it('rejects weak password', () => {
      const result = userInputSchema.safeParse({ ...validUser, password: '123' });
      expect(result.success).toBe(false);
    });
  });
});
