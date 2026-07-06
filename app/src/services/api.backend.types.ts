// Our actual backend types (snake_case)
export type AuthUser = {
  id: number;
  email: string;
  full_name: string;
  role: 'admin' | 'facilitadora' | 'participante';
  active: boolean;
};

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

export type Course = {
  id: number;
  name: string;
  description: string;
  category: string;
  level: string;
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
  created_at: string;
  updated_at: string;
};
