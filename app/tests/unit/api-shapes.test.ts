import { describe, it, expect } from 'vitest';
import type {
  AuthUser,
  LoginResponse,
  Participant,
  ParticipantsResponse,
  Course,
  CoursesResponse,
  Enrollment,
  EnrollmentsResponse,
  AuditEvent,
  AuditResponse,
  User,
  UsersResponse,
  DashboardIndicators,
} from '@/services/api';

// ─── API Response Shape Tests ────────────────────────────────────────────────

describe('API Response Shapes', () => {
  describe('AuthUser', () => {
    it('has required fields', () => {
      const user: AuthUser = {
        id: 1,
        email: 'admin@acoes.local',
        full_name: 'Admin User',
        role: 'admin',
        active: true,
      };
      expect(user.id).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.full_name).toBeDefined();
      expect(user.role).toMatch(/^(admin|facilitadora|participante)$/);
      expect(typeof user.active).toBe('boolean');
    });

    it('role is one of allowed values', () => {
      const roles: AuthUser['role'][] = ['admin', 'facilitadora', 'participante'];
      roles.forEach((role) => {
        const user: AuthUser = {
          id: 1,
          email: 'test@test.com',
          full_name: 'Test',
          role,
          active: true,
        };
        expect(['admin', 'facilitadora', 'participante']).toContain(user.role);
      });
    });
  });

  describe('LoginResponse', () => {
    it('contains user and redirectTo', () => {
      const response: LoginResponse = {
        user: {
          id: 1,
          email: 'admin@acoes.local',
          full_name: 'Admin User',
          role: 'admin',
          active: true,
        },
        redirectTo: '/dashboard',
      };
      expect(response.user).toBeDefined();
      expect(response.redirectTo).toBeDefined();
      expect(typeof response.redirectTo).toBe('string');
    });
  });

  describe('ParticipantsResponse', () => {
    it('has data array and meta object', () => {
      const response: ParticipantsResponse = {
        data: [],
        meta: { page: 1, limit: 20, offset: 0 },
      };
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.meta).toBeDefined();
      expect(response.meta.page).toBeDefined();
      expect(response.meta.limit).toBeDefined();
      expect(response.meta.offset).toBeDefined();
    });

    it('data items have required participant fields', () => {
      const participant: Participant = {
        id: 1,
        participant_code: 'P001',
        full_name: 'Maria Garcia',
        document_number: '12345678',
        birth_date: '1990-01-01',
        gender: 'female',
        phone_country: 'SV',
        phone_dial_code: '+503',
        phone_number: '12345678',
        phone: '+503 1234 5678',
        email: 'maria@example.com',
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
      };
      expect(participant.id).toBeDefined();
      expect(participant.participant_code).toBeDefined();
      expect(participant.full_name).toBeDefined();
      expect(participant.lifecycle_state).toMatch(/^(active|inactive)$/);
    });
  });

  describe('CoursesResponse', () => {
    it('has data array', () => {
      const response: CoursesResponse = {
        data: [],
      };
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('course items have required fields', () => {
      const course: Course = {
        id: 1,
        name: 'Digital Skills',
        description: 'Learn skills',
        category: 'technology',
        level: 'beginner',
        instructor: 'John Doe',
        instructor_bio: null,
        price: 0,
        price_original: null,
        image: null,
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-03-01',
        horario: 'Mon 9-11am',
        ubicacion: 'Online',
        lat: null,
        lng: null,
        cupo_maximo: 20,
        inscritos: 5,
        estado: 'published',
        tags: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      expect(course.id).toBeDefined();
      expect(course.name).toBeDefined();
      expect(course.estado).toBeDefined();
      expect(course.cupo_maximo).toBeDefined();
      expect(course.inscritos).toBeDefined();
    });
  });

  describe('EnrollmentsResponse', () => {
    it('has data array', () => {
      const response: EnrollmentsResponse = {
        data: [],
      };
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('enrollment items have required fields', () => {
      const enrollment: Enrollment = {
        id: 1,
        course_id: 1,
        participant_id: 1,
        enrolled_by: 1,
        full_name: 'Maria Garcia',
        email: 'maria@example.com',
        phone: '+503 12345678',
        dui: null,
        fecha_inscripcion: '2024-01-01',
        estado: 'confirmed',
        notas: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      expect(enrollment.id).toBeDefined();
      expect(enrollment.course_id).toBeDefined();
      expect(enrollment.estado).toBeDefined();
    });
  });

  describe('AuditResponse', () => {
    it('has data array and meta with total', () => {
      const response: AuditResponse = {
        data: [],
        meta: { total: 0, limit: 20, offset: 0 },
      };
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.meta.total).toBeDefined();
    });

    it('audit events have required fields', () => {
      const event: AuditEvent = {
        id: 1,
        entity_type: 'participant',
        entity_id: 1,
        action: 'create',
        actor_user_id: 1,
        before_data: null,
        after_data: { full_name: 'Maria Garcia' },
        metadata: null,
        created_at: '2024-01-01T00:00:00Z',
      };
      expect(event.id).toBeDefined();
      expect(event.entity_type).toBeDefined();
      expect(event.action).toBeDefined();
      expect(event.created_at).toBeDefined();
    });
  });

  describe('UsersResponse', () => {
    it('has data array', () => {
      const response: UsersResponse = {
        data: [],
      };
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('user items have required fields', () => {
      const user: User = {
        id: 1,
        email: 'admin@acoes.local',
        full_name: 'Admin User',
        role: 'admin',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
      };
      expect(user.id).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.role).toBeDefined();
    });
  });

  describe('DashboardIndicators', () => {
    it('has all required indicator categories', () => {
      const indicators: DashboardIndicators = {
        byDepartment: { 'San Salvador': 10 },
        byProgram: { 'Digital Skills': 8 },
        byEducationLevel: { bachillerato: 5 },
        byRoleFunction: { teacher: 3 },
        byGender: { female: 6, male: 4 },
      };
      expect(indicators.byDepartment).toBeDefined();
      expect(indicators.byProgram).toBeDefined();
      expect(indicators.byEducationLevel).toBeDefined();
      expect(indicators.byRoleFunction).toBeDefined();
      expect(indicators.byGender).toBeDefined();
    });

    it('indicator values are numbers', () => {
      const indicators: DashboardIndicators = {
        byDepartment: { 'San Salvador': 10 },
        byProgram: { 'Digital Skills': 8 },
        byEducationLevel: { bachillerato: 5 },
        byRoleFunction: { teacher: 3 },
        byGender: { female: 6, male: 4 },
      };
      Object.values(indicators.byDepartment).forEach((v) =>
        expect(typeof v).toBe('number')
      );
    });
  });
});
