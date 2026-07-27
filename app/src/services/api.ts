const BASE_URL = import.meta.env.VITE_API_URL ?? '';

// Import reference types
import type { Registro, User, Curso, InscripcionCurso, DashboardStats, LoginCredentials } from '@/types'

// Import our backend types for mapping
import type { AuthUser, BackendUser, Participant, Course, ParticipantHistoryEntry, CoursePublicLink, PublicEnrollmentLink, PublicEnrollmentResult } from './api.backend.types'

/**
 * Shape of the `validation_failed` envelope the backend returns on a Zod
 * rejection (HTTP 400) from endpoints that route through the shared
 * participant schema.
 */
export type ApiValidationError = {
  error: 'validation_failed';
  issues: Array<{ path: (string | number)[]; message: string; code: string }>;
};

/**
 * Thrown by the central request() when the backend rejects a payload with a
 * 400 + `validation_failed` envelope. Carries the parsed Zod issues so the
 * caller can render per-field errors.
 */
export class ValidationApiError extends Error {
  public issues: ApiValidationError['issues'];
  constructor(issues: ApiValidationError['issues']) {
    super('validation_failed');
    this.name = 'ValidationApiError';
    this.issues = issues;
  }
}

async function parseErrorBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function request<T>(
  method: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await parseErrorBody(response);
    if (
      body &&
      typeof body === 'object' &&
      (body as { error?: string }).error === 'validation_failed' &&
      Array.isArray((body as ApiValidationError).issues)
    ) {
      throw new ValidationApiError((body as ApiValidationError).issues);
    }
    const fallback =
      (body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string'
        ? (body as { error: string }).error
        : response.statusText) || 'Unknown error';
    throw new Error(fallback);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export const api = {
  get<T>(path: string, options?: RequestInit): Promise<T> {
    return request<T>('GET', path, options);
  },

  post<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    return request<T>('POST', path, {
      ...options,
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    return request<T>('PATCH', path, {
      ...options,
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    return request<T>('DELETE', path, {
      ...options,
      body: body ? JSON.stringify(body) : undefined,
    });
  },
};

// ============================
// AUTH
// ============================
export async function login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
  // Map correo/contrasena to email/password for our backend
  const response = await api.post<{ user: AuthUser; redirectTo: string }>('/api/login', {
    email: credentials.correo,
    password: credentials.contrasena,
  });
  
  // Map our AuthUser to reference User
  const mappedUser: User = {
    id: String(response.user.id),
    nombre: response.user.full_name,
    correo: response.user.email,
    rol: response.user.role,
  };
  
  return { user: mappedUser, token: 'session' };
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await api.get<{ user: AuthUser }>('/api/me');
    if (!response.user) return null;
    
    const mappedUser: User = {
      id: String(response.user.id),
      nombre: response.user.full_name,
      correo: response.user.email,
      rol: response.user.role,
    };
    
    return mappedUser;
  } catch {
    return null;
  }
}

export async function getFacilitators(): Promise<Array<{ id: string; name: string }>> {
  const response = await api.get<{ data: BackendUser[] }>('/api/users');
  return response.data
    .filter(user => user.role === 'facilitador' && user.active)
    .map(user => ({ id: String(user.id), name: user.full_name }));
}

export type EquipoUser = {
  id: string
  email: string
  fullName: string
  role: 'admin' | 'empleado'
  active: boolean
};

/**
 * Members of the in-house team (admins + empleados) shown on the dashboard's
 * Equipo panel. Excludes `facilitador` and `participante` rows — facilitators
 * have their own panel and participants are public registrations.
 */
export async function getEquipoUsers(): Promise<EquipoUser[]> {
  const response = await api.get<{ data: BackendUser[] }>('/api/users');
  return response.data
    .filter(user => user.role === 'admin' || user.role === 'empleado')
    .map(user => ({
      id: String(user.id),
      email: user.email,
      fullName: user.full_name,
      role: user.role as 'admin' | 'empleado',
      active: user.active,
    }));
}

export function logout(): void {
  // Call our backend logout endpoint
  api.post('/api/logout').catch(console.error);
}

// ============================
// REGISTROS (Participants mapped to Registros)
// ============================
function mapParticipantToRegistro(p: Participant): Registro {
  return {
    id: String(p.id),
    courseId: p.course_id ? String(p.course_id) : undefined,
    facilitatorId: p.facilitator_id ? String(p.facilitator_id) : undefined,
    nombre: p.full_name,
    dui: p.document_number || '',
    fechaNacimiento: p.birth_date || '',
    genero: p.gender || '',
    pais: p.phone_country || 'El Salvador',
    prefijo: p.phone_dial_code || '+503',
    celular: p.phone_number || '',
    correo: p.email || '',
    direccion: p.address || '',
    distrito: p.district || '',
    departamento: p.department || '',
    municipio: p.municipality || '',
    entidad: p.organization || '',
    funcion: p.role_function || '',
    nivelEducativo: p.education_level || '',
    capacitacion: p.program || '',
    autorizaDatos: p.consent,
    observaciones: p.notes || '',
    fechaRegistro: p.created_at.split('T')[0],
    codigo: p.participant_code || '',
    estado: p.lifecycle_state === 'active' ? 'activo' : p.lifecycle_state === 'inactive' ? 'inactivo' : 'pendiente',
  };
}

export async function getRegistros(params?: {
  search?: string
  departamento?: string
  funcion?: string
  estado?: string
  page?: number
  limit?: number
}): Promise<{ data: Registro[]; total: number }> {
  // Map to our backend params
  const backendParams: Record<string, string> = {};
  if (params?.search) backendParams.q = params.search;
  if (params?.departamento) backendParams.department = params.departamento;
  if (params?.estado) backendParams.status = params.estado;
  if (params?.page) backendParams.page = String(params.page);
  if (params?.limit) backendParams.limit = String(params.limit);

  const query = new URLSearchParams(backendParams).toString();
  const response = await api.get<{ data: Participant[]; meta: { page: number; limit: number; offset: number; total: number } }>(
    `/api/participants${query ? `?${query}` : ''}`
  );

  return {
    data: response.data.map(mapParticipantToRegistro),
    total: response.meta.total,
  };
}

export async function getParticipantHistory(id: string): Promise<{ participant: Participant; history: ParticipantHistoryEntry[] }> {
  return api.get(`/api/participants/${id}/history`)
}

export async function getParticipantDuplicates(id: string): Promise<{ participant: Participant; duplicates: Participant[] }> {
  return api.get(`/api/participants/${id}/duplicates`)
}

export async function downloadParticipantsXlsx(params?: { search?: string; departamento?: string; estado?: string; page?: number; limit?: number }): Promise<void> {
  const backendParams: Record<string, string> = { format: 'xlsx' }
  if (params?.search) backendParams.q = params.search
  if (params?.departamento) backendParams.department = params.departamento
  if (params?.estado) backendParams.status = params.estado
  if (params?.page) backendParams.page = String(params.page)
  if (params?.limit) backendParams.limit = String(params.limit)

  const query = new URLSearchParams(backendParams).toString()
  const response = await fetch(`${BASE_URL}/api/participants${query ? `?${query}` : ''}`, { credentials: 'include' })
  if (!response.ok) throw new Error(await response.text())

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ACOES_Registros_${new Date().toISOString().split('T')[0]}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

export async function getRegistro(id: string): Promise<Registro> {
  const response = await api.get<{ data: Participant }>(`/api/participants/${id}`);
  return mapParticipantToRegistro(response.data);
}

export async function createRegistro(data: Omit<Registro, 'id' | 'codigo' | 'fechaRegistro' | 'estado'>): Promise<Registro> {
  // Map Registro to our backend Participant format. The public schema
  // (`publicParticipantSubmissionSchema`) preprocesses the wire payload
  // and synthesizes a combined `phone` value from `phone_dial_code` +
  // `phone_number` when the SPA omits it, so we no longer build the
  // combined string on the client (PR4 housekeeping — the previous
  // defensive patch was a hidden dependency of the round-trip).
  const backendData = {
    courseId: data.courseId ? Number(data.courseId) : undefined,
    full_name: data.nombre,
    document_number: data.dui,
    birth_date: data.fechaNacimiento,
    gender: data.genero,
    phone_country: data.pais,
    phone_dial_code: data.prefijo,
    phone_number: data.celular,
    email: data.correo,
    address: data.direccion,
    municipality: data.municipio,
    department: data.departamento,
    district: data.distrito,
    organization: data.entidad,
    role_function: data.funcion,
    education_level: data.nivelEducativo,
    program: data.capacitacion,
    consent: data.autorizaDatos,
    notes: data.observaciones,
  };

  const response = await api.post<{ data: Participant }>('/api/public/participants', backendData);
  return mapParticipantToRegistro(response.data);
}

export async function deleteRegistro(id: string): Promise<void> {
  await api.delete(`/api/participants`, { id: parseInt(id) });
}

// ============================
// CURSOS (Courses mapped to Cursos)
// ============================
function mapCourseToCurso(c: Course): Curso {
  return {
    id: String(c.id),
    nombre: c.name,
    descripcion: c.description,
    categoria: c.category,
    nivel: c.level,
    precio: c.price,
    precioOriginal: c.price_original ?? undefined,
    imagen: c.image || '',
    fechaInicio: c.fecha_inicio,
    fechaFin: c.fecha_fin,
    horario: c.horario,
    ubicacion: c.ubicacion,
    departamento: c.departamento || '',
    municipio: c.municipio || '',
    lat: c.lat ?? undefined,
    lng: c.lng ?? undefined,
    cupoMaximo: c.cupo_maximo,
    inscritos: c.inscritos,
    facilitadorId: c.facilitator_id ? String(c.facilitator_id) : undefined,
    instructor: c.instructor,
    instructorBio: c.instructor_bio || '',
    estado: mapEstado(c.estado),
    tags: c.tags || [],
    fechaRegistro: c.created_at.split('T')[0],
  };
}

export async function createCoursePublicLink(id: string): Promise<CoursePublicLink> {
  const response = await api.post<{ data: CoursePublicLink }>(`/api/courses/${id}/public-link`);
  return response.data;
}

export async function resolvePublicEnrollmentLink(token: string): Promise<PublicEnrollmentLink> {
  const response = await api.get<{ data: PublicEnrollmentLink }>(`/api/public/courses/enrollment?token=${encodeURIComponent(token)}`);
  return response.data;
}

function mapEstado(estado: string): Curso['estado'] {
  switch (estado) {
    case 'active':
    case 'open':
      return 'abierto';
    case 'full':
      return 'lleno';
    case 'in_progress':
      return 'en_curso';
    case 'finished':
      return 'finalizado';
    case 'coming_soon':
      return 'proximamente';
    default:
      return 'abierto';
  }
}

function mapEstadoToBackend(estado: string): string {
  switch (estado) {
    case 'abierto':
      return 'enrolling';
    case 'lleno':
      return 'in_progress';
    case 'en_curso':
      return 'in_progress';
    case 'finalizado':
      return 'completed';
    case 'proximamente':
      return 'published';
    default:
      return 'enrolling';
  }
}

// Reverse geocode lat/lng to departamento y municipio via Nominatim (OpenStreetMap)
export async function reverseGeocode(lat: number, lng: number): Promise<{ departamento: string; municipio: string; ubicacion: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=es`,
      { headers: { 'Accept-Language': 'es' } }
    );
    if (!res.ok) return null;
    const data = await res.json() as {
      address?: {
        state?: string;
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        county?: string;
      };
      display_name?: string;
    };

    if (!data.address) return null;

    const addr = data.address;
    // El Salvador states = departamentos
    const departamento = addr.state ?? addr.county ?? '';
    // Prefer city/town/village over municipality
    const municipio = addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? '';
    const ubicacion = data.display_name ?? `${municipio}, ${departamento}`;

    return { departamento, municipio, ubicacion };
  } catch {
    return null;
  }
}

export async function getCursos(params?: { categoria?: string; nivel?: string; estado?: string; search?: string; includeHidden?: boolean }): Promise<Curso[]> {
  const searchParams = new URLSearchParams();
  if (params?.categoria) searchParams.set('category', params.categoria);
  if (params?.nivel) searchParams.set('nivel', params.nivel);
  if (params?.estado) searchParams.set('estado', params.estado);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.includeHidden) searchParams.set('includeHidden', 'true');
  
  const query = searchParams.toString();
  const response = await api.get<{ data: Course[] }>(`/api/courses${query ? `?${query}` : ''}`);
  return response.data.map(mapCourseToCurso);
}

export async function getCourseRecords(params?: { search?: string; estado?: string; includeHidden?: boolean }): Promise<Course[]> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);
  if (params?.estado) searchParams.set('estado', params.estado);
  if (params?.includeHidden) searchParams.set('includeHidden', 'true');
  const query = searchParams.toString();
  const response = await api.get<{ data: Course[] }>(`/api/courses${query ? `?${query}` : ''}`);
  return response.data;
}

export async function getCurso(id: string): Promise<Curso> {
  const response = await api.get<{ data: Course }>(`/api/courses/${id}`);
  return mapCourseToCurso(response.data);
}

export async function createCurso(data: Omit<Curso, 'id' | 'inscritos' | 'fechaRegistro'>): Promise<Curso> {
  const backendData = {
    name: data.nombre,
    description: data.descripcion,
    category: data.categoria,
    level: data.nivel,
    price: data.precio,
    price_original: data.precioOriginal,
    image: data.imagen,
    fecha_inicio: data.fechaInicio,
    fecha_fin: data.fechaFin,
    horario: data.horario,
    ubicacion: data.ubicacion,
    departamento: data.departamento,
    municipio: data.municipio,
    lat: data.lat,
    lng: data.lng,
    cupo_maximo: data.cupoMaximo,
    facilitator_id: data.facilitadorId ? Number(data.facilitadorId) : null,
    instructor: data.instructor,
    instructor_bio: data.instructorBio,
    tags: data.tags,
    estado: mapEstadoToBackend(data.estado),
  };
  
  const response = await api.post<{ data: Course }>('/api/courses', backendData);
  return mapCourseToCurso(response.data);
}

export async function updateCurso(id: string, data: Partial<Curso>): Promise<Curso> {
  const backendData: Record<string, unknown> = {};
  if (data.nombre) backendData.name = data.nombre;
  if (data.descripcion) backendData.description = data.descripcion;
  if (data.categoria) backendData.category = data.categoria;
  if (data.nivel) backendData.level = data.nivel;
  if (data.precio !== undefined) backendData.price = data.precio;
  if (data.precioOriginal !== undefined) backendData.price_original = data.precioOriginal;
  if (data.imagen) backendData.image = data.imagen;
  if (data.fechaInicio) backendData.fecha_inicio = data.fechaInicio;
  if (data.fechaFin) backendData.fecha_fin = data.fechaFin;
  if (data.horario) backendData.horario = data.horario;
  if (data.ubicacion) backendData.ubicacion = data.ubicacion;
  if (data.departamento !== undefined) backendData.departamento = data.departamento;
  if (data.municipio !== undefined) backendData.municipio = data.municipio;
  if (data.lat !== undefined) backendData.lat = data.lat;
  if (data.lng !== undefined) backendData.lng = data.lng;
  if (data.cupoMaximo) backendData.cupo_maximo = data.cupoMaximo;
  if (data.facilitadorId !== undefined) backendData.facilitator_id = data.facilitadorId ? Number(data.facilitadorId) : null;
  if (data.instructor) backendData.instructor = data.instructor;
  if (data.instructorBio !== undefined) backendData.instructor_bio = data.instructorBio;
  if (data.tags) backendData.tags = data.tags;
  if (data.estado !== undefined) backendData.estado = mapEstadoToBackend(data.estado);
  
  const response = await api.patch<{ data: Course }>(`/api/courses/${id}`, backendData);
  return mapCourseToCurso(response.data);
}

export async function deleteCurso(id: string): Promise<void> {
  await api.delete(`/api/courses/${id}`);
}

// ============================
// INSCRIPCIONES A CURSOS
// ============================
export async function getInscripciones(cursoId: string): Promise<InscripcionCurso[]> {
  const response = await api.get<{ data: unknown[] }>(`/api/enrollments?courseId=${cursoId}`);
  // Map enrollments to InscripcionCurso
  return response.data.map((e: any) => ({
    id: String(e.id),
    cursoId: String(e.course_id),
    nombre: e.full_name,
    correo: e.email,
    telefono: e.phone,
    dui: e.dui || '',
    fechaInscripcion: e.fecha_inscripcion,
    estado: e.estado as 'confirmada' | 'pendiente' | 'cancelada',
    notas: e.notas || '',
  }));
}

/**
 * Public enrollment submission (PR3 contract).
 *
 * The backend accepts only `{ token, dui }` and replies with one of:
 *
 *   • 201 + `{ data: enrollment }` → `{ kind: 'enrollment', data }`
 *   • 200 + `{ redirect: '/registro?redirect=...' }` → `{ kind: 'redirect', redirect }`
 *   • 4xx → `throw` with the backend's error message (e.g., malformed DUI,
 *     course full, invalid token)
 *
 * The previous 5-field payload (`nombre`, `correo`, `telefono`, `notas`)
 * is no longer accepted by the public path; the SPA now collects only the
 * DUI and lets the backend resolve the participant. Admin enrollment
 * creation goes through `POST /api/enrollments` directly (see
 * `src/pages/api/enrollments.ts`); this helper only covers the public flow.
 *
 * See `openspec/changes/acoes-dui-enrollment-flow/specs/public-enrollment-by-dui/spec.md`.
 */
export async function inscribir(
  data: { cursoId: string; dui: string },
  token: string,
): Promise<PublicEnrollmentResult> {
  if (!token) {
    throw new Error('La inscripción pública requiere un token');
  }

  const response = await api.post<{ data?: unknown; redirect?: string }>(
    '/api/public/enrollments',
    {
      token,
      dui: data.dui,
    },
  );

  if (
    response &&
    typeof response === 'object' &&
    'redirect' in response &&
    typeof (response as { redirect?: unknown }).redirect === 'string'
  ) {
    return { kind: 'redirect', redirect: (response as { redirect: string }).redirect };
  }

  return {
    kind: 'enrollment',
    data: response.data as PublicEnrollmentResult extends { kind: 'enrollment'; data: infer D }
      ? D
      : never,
  };
}

export async function cancelarInscripcion(id: string): Promise<void> {
  await api.delete(`/api/enrollments/${id}`);
}

// ============================
// DASHBOARD STATS
// ============================
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Get participants for stats
    const participantsRes = await api.get<{ data: Participant[] }>('/api/participants?limit=1000');
    const participants = participantsRes.data;
    
    // Get courses for stats
    const coursesRes = await api.get<{ data: Course[] }>('/api/courses');
    const courses = coursesRes.data;
    
    // Get enrollments
    const enrollmentsRes = await api.get<{ data: unknown[] }>('/api/enrollments');
    const enrollments = enrollmentsRes.data;
    
    // Calculate stats
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const registrosSemana = participants.filter(p => new Date(p.created_at) >= weekAgo).length;

    // Canonical role values per PR2 are 'Facilitador' / 'Participante'
    // (singular, masculine-default). The previous filter checked
    // 'Facilitadora' / 'facilitadora', which never matched the seeded
    // data and left the Facilitadores stat at 0. Keep the lowercase
    // match for safety against historical admin rows that may have
    // stored the legacy spelling before PR2 normalized the catalog.
    const facilitadores = participants.filter(p => p.role_function === 'Facilitador' || p.role_function === 'facilitador').length;
    const participantes = participants.filter(p => p.role_function === 'Participante' || p.role_function === 'participante').length;

    const cursosActivos = courses.filter(c => c.estado === 'active' || c.estado === 'open').length;

    // Group by department
    const porDepartamento: { name: string; value: number }[] = [];
    const deptMap = new Map<string, number>();
    participants.forEach(p => {
      if (p.department) {
        deptMap.set(p.department, (deptMap.get(p.department) || 0) + 1);
      }
    });
    deptMap.forEach((value, name) => porDepartamento.push({ name, value }));

    // Group by gender
    const porGenero: { name: string; value: number }[] = [];
    const genderMap = new Map<string, number>();
    participants.forEach(p => {
      if (p.gender) {
        genderMap.set(p.gender, (genderMap.get(p.gender) || 0) + 1);
      }
    });
    genderMap.forEach((value, name) => porGenero.push({ name, value }));

    // Build monthly registrations from real data so the chart isn't a
    // blank grid. Falls back to an empty array when no registrations
    // have a parseable date, so the chart renders the empty state.
    const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const;
    const monthCounts = new Array<number>(12).fill(0);
    participants.forEach(p => {
      const created = new Date(p.created_at);
      if (!Number.isNaN(created.getTime())) {
        const m = created.getUTCMonth();
        monthCounts[m] = (monthCounts[m] ?? 0) + 1;
      }
    });
    const porMes = monthLabels.map((mes, i) => ({ mes, cantidad: monthCounts[i] ?? 0 }));

    return {
      totalRegistros: participants.length,
      registrosSemana,
      facilitadores,
      participantes,
      totalCursos: courses.length,
      cursosActivos,
      inscripciones: enrollments.length,
      cuposDisponibles: courses.reduce((sum, c) => sum + Math.max(0, c.cupo_maximo - c.inscritos), 0),
      porGenero,
      porDepartamento,
      porMes,
      cursosPorCategoria: [],
      inscripcionesPorCurso: [],
    };
  } catch {
    // Return default stats if API fails
    return {
      totalRegistros: 0,
      registrosSemana: 0,
      facilitadores: 0,
      participantes: 0,
      totalCursos: 0,
      cursosActivos: 0,
      inscripciones: 0,
      cuposDisponibles: 0,
      porGenero: [],
      porDepartamento: [],
      porMes: [],
      cursosPorCategoria: [],
      inscripcionesPorCurso: [],
    };
  }
}

// ============================
// EXPORT
// ============================
export function exportToCSV(registros: Registro[]): void {
  const data = registros.map(r => ({ Codigo: r.codigo, Nombre: r.nombre, DUI: r.dui, Celular: r.celular, Correo: r.correo, Departamento: r.departamento, Funcion: r.funcion, Fecha: r.fechaRegistro, Estado: r.estado }))
  const csv = [Object.keys(data[0]).join(','), ...data.map(row => Object.values(row).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ACOES_Registros_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
}
