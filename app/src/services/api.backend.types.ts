// Our actual backend types (snake_case)
export type Role = 'admin' | 'facilitador' | 'empleado' | 'participante';

export type AuthUser = {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  active: boolean;
};

export type BackendUser = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  active: boolean;
  created_at: string;
};

export type Participant = {
  id: number;
  participant_code: string;
  course_id: number | null;
  facilitator_id: number | null;
  full_name: string;
  document_number: string;
  birth_date: string;
  gender: string;
  phone_country: string;
  phone_dial_code: string;
  phone_number: string;
  phone: string;
  email: string | null;
  address: string | null;
  municipality: string | null;
  department: string | null;
  district: string | null;
  organization: string | null;
  role_function: string;
  education_level: string | null;
  program: string | null;
  status: string;
  lifecycle_state: 'active' | 'inactive';
  deleted_at: string | null;
  deleted_by: number | null;
  notes: string | null;
  consent: boolean;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
};

export type ParticipantHistoryEntry = {
  id: number;
  action: string;
  actor_user_id: number | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type Course = {
  id: number;
  name: string;
  description: string;
  category: string;
  level: string;
  facilitator_id: number | null;
  instructor: string;
  instructor_bio: string | null;
  price: number;
  price_original: number | null;
  image: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  horario: string;
  ubicacion: string;
  departamento: string | null;
  municipio: string | null;
  lat: number | null;
  lng: number | null;
  cupo_maximo: number;
  inscritos: number;
  estado: string;
  tags: string[] | null;
  public_enrollment_token: string | null;
  created_at: string;
  updated_at: string;
};

export type CoursePublicLink = {
  token: string;
  publicUrl: string;
};

export type PublicEnrollmentCourse = {
  id: number;
  name: string;
  instructor: string;
  estado: string;
  cupo_maximo: number;
  inscritos: number;
};

export type PublicEnrollmentLink = {
  token: string;
  course: PublicEnrollmentCourse;
};

/**
 * Result of a public enrollment attempt against `POST /api/public/enrollments`.
 *
 * The backend distinguishes between "we found the participant and created
 * the enrollment" (201 with `{ data }`) and "we did not find a participant
 * with that DUI; here's a redirect to the registration page" (200 with
 * `{ redirect }`). The SPA's `inscribir()` returns this union so the caller
 * can branch on `kind` and either show success or navigate the round-trip.
 *
 * See `openspec/changes/acoes-dui-enrollment-flow/specs/public-enrollment-by-dui/spec.md`.
 */
export type PublicEnrollmentResult =
  | {
      kind: 'enrollment';
      data: {
        id: number;
        course_id: number;
        participant_id: number;
        full_name: string;
        email: string | null;
        phone: string;
        dui: string | null;
        fecha_inscripcion: string;
        estado: string;
      };
    }
  | { kind: 'redirect'; redirect: string };
