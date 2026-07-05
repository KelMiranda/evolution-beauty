const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4321';

export type AuthUser = {
  id: number;
  email: string;
  full_name: string;
  role: 'admin' | 'facilitadora' | 'participante';
  active: boolean;
};

export type LoginResponse = {
  user: AuthUser;
  redirectTo: string;
};

export type ApiError = {
  error: string;
  details?: Record<string, string[]>;
};

function getErrorMessage(response: Response): string {
  try {
    const data = response.json() as ApiError;
    return data.error ?? 'Unknown error';
  } catch {
    return response.statusText;
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
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorMessage = getErrorMessage(response);
    throw new Error(errorMessage);
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

// Auth API
export async function login(email: string, password: string): Promise<LoginResponse> {
  return api.post<LoginResponse>('/api/login', { email, password });
}

export async function logout(): Promise<{ ok: boolean }> {
  return api.post<{ ok: boolean }>('/api/logout');
}

export async function getMe(): Promise<{ user: AuthUser }> {
  return api.get<{ user: AuthUser }>('/api/me');
}

// Participants API
export type Participant = {
  id: number;
  participant_code: string;
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

export type ParticipantsResponse = {
  data: Participant[];
  meta: { page: number; limit: number; offset: number };
};

export async function getParticipants(params?: {
  q?: string;
  department?: string;
  status?: string;
  lifecycleState?: 'active' | 'inactive' | 'all';
  page?: number;
  limit?: number;
}): Promise<ParticipantsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.q) searchParams.set('q', params.q);
  if (params?.department) searchParams.set('department', params.department);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.lifecycleState) searchParams.set('lifecycleState', params.lifecycleState);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const query = searchParams.toString();
  return api.get<ParticipantsResponse>(`/api/participants${query ? `?${query}` : ''}`);
}

export async function createParticipant(data: Record<string, unknown>): Promise<{ data: Participant }> {
  return api.post<{ data: Participant }>('/api/participants', data);
}

export async function patchParticipant(id: number, data: Record<string, unknown>): Promise<{ data: Participant }> {
  return api.patch<{ data: Participant }>('/api/participants', { id, ...data });
}

export async function deleteParticipant(id: number): Promise<{ data: Participant }> {
  return api.delete<{ data: Participant }>('/api/participants', { id });
}

// Users API
export type User = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  active: boolean;
  created_at: string;
};

export type UsersResponse = {
  data: User[];
};

export async function getUsers(): Promise<UsersResponse> {
  return api.get<UsersResponse>('/api/users');
}

export async function createUser(data: {
  email: string;
  password: string;
  fullName: string;
  role: string;
  active: boolean;
}): Promise<{ data: User }> {
  return api.post<{ data: User }>('/api/users', data);
}

export async function patchUser(id: number, data: Record<string, unknown>): Promise<{ data: User }> {
  return api.patch<{ data: User }>('/api/users', { id, ...data });
}

export async function deleteUser(id: number): Promise<{ ok: boolean }> {
  return api.delete<{ ok: boolean }>('/api/users', { id });
}

// Audit API
export type AuditEvent = {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  actor_user_id: number | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type AuditResponse = {
  data: AuditEvent[];
  meta: { total: number; limit: number; offset: number };
};

export async function getAuditEvents(params?: {
  entityType?: string;
  actorUserId?: number;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}): Promise<AuditResponse> {
  const searchParams = new URLSearchParams();
  if (params?.entityType) searchParams.set('entityType', params.entityType);
  if (params?.actorUserId) searchParams.set('actorUserId', String(params.actorUserId));
  if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom);
  if (params?.dateTo) searchParams.set('dateTo', params.dateTo);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  const query = searchParams.toString();
  return api.get<AuditResponse>(`/api/audit${query ? `?${query}` : ''}`);
}
