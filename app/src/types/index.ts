export interface Registro {
  id: string
  courseId?: string
  facilitatorId?: string
  nombre: string
  dui: string
  fechaNacimiento: string
  genero: string
  pais: string
  prefijo: string
  celular: string
  correo: string
  direccion: string
  distrito: string
  departamento: string
  municipio: string
  entidad: string
  funcion: string
  nivelEducativo: string
  capacitacion: string
  autorizaDatos: boolean
  observaciones: string
  fechaRegistro: string
  codigo: string
  estado: 'activo' | 'pendiente' | 'inactivo'
}

export interface User {
  id: string
  nombre: string
  correo: string
  rol: 'admin' | 'operador' | 'participante'
}

export interface Curso {
  id: string
  nombre: string
  descripcion: string
  categoria: string
  nivel: string
  precio: number
  precioOriginal?: number
  imagen: string
  fechaInicio: string
  fechaFin: string
  horario: string
  ubicacion: string
  departamento: string
  municipio: string
  lat?: number
  lng?: number
  cupoMaximo: number
  inscritos: number
  facilitadorId?: string
  instructor: string
  instructorBio: string
  estado: 'abierto' | 'lleno' | 'en_curso' | 'finalizado' | 'proximamente'
  tags: string[]
  fechaRegistro: string
}

export interface InscripcionCurso {
  id: string
  cursoId: string
  nombre: string
  correo: string
  telefono: string
  dui: string
  fechaInscripcion: string
  estado: 'confirmada' | 'pendiente' | 'cancelada'
  notas: string
}

export interface DashboardStats {
  totalRegistros: number
  registrosSemana: number
  facilitadoras: number
  participantes: number
  totalCursos: number
  cursosActivos: number
  inscripciones: number
  cuposDisponibles: number
  porGenero: { name: string; value: number }[]
  porDepartamento: { name: string; value: number }[]
  porMes: { mes: string; cantidad: number }[]
  cursosPorCategoria: { name: string; value: number }[]
  inscripcionesPorCurso: { name: string; inscritos: number; cupo: number }[]
}

export interface LoginCredentials {
  correo: string
  contrasena: string
}
