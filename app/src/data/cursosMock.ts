import type { Curso, InscripcionCurso } from '@/types'

export const mockCursos: Curso[] = [
  {
    id: '1',
    nombre: 'Maestría en Colorimetría Avanzada',
    descripcion: 'Aprende las técnicas más sofisticadas de coloración capilar, incluyendo balayage, ombré, técnicas de decoloración controlada y corrección de color. Curso práctico con modelos reales.',
    categoria: 'Colorimetría',
    nivel: 'Avanzado',
    precio: 185,
    precioOriginal: 250,
    imagen: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=500&fit=crop',
    fechaInicio: '2026-07-15',
    fechaFin: '2026-07-19',
    horario: '9:00 AM - 4:00 PM',
    ubicacion: 'Hotel Real Intercontinental, San Salvador',
    departamento: "San Salvador",
    municipio: "San Salvador",
    lat: 13.6929,
    lng: -89.2182,
    cupoMaximo: 20,
    inscritos: 14,
    instructor: 'Laura Méndez',
    instructorBio: 'Colorista internacional con 15 años de experiencia. Certificada por Wella Professionals y L\'Oréal.',
    estado: 'abierto',
    tags: ['Práctico', 'Certificación', 'Material incluido'],
    fechaRegistro: '2026-06-01',
  },
  {
    id: '2',
    nombre: 'Corte Clásico y Tendencias 2026',
    descripcion: 'Domina los cortes clásicos que nunca pasan de moda y descubre las tendencias más actuales. Incluye técnicas de texturizado, capas y acabados de precisión.',
    categoria: 'Corte',
    nivel: 'Intermedio',
    precio: 120,
    imagen: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=500&fit=crop',
    fechaInicio: '2026-07-22',
    fechaFin: '2026-07-24',
    horario: '10:00 AM - 3:00 PM',
    ubicacion: 'Salón ACOES Centro, Colonia Escalón, San Salvador',
    departamento: "San Salvador",
    municipio: "San Salvador",
    lat: 13.7013,
    lng: -89.2244,
    cupoMaximo: 15,
    inscritos: 15,
    instructor: 'Carlos Rivera',
    instructorBio: 'Estilista premiado con certificación Vidal Sassoon. 12 años de trayectoria internacional.',
    estado: 'lleno',
    tags: ['Tendencias', 'Práctico'],
    fechaRegistro: '2026-06-05',
  },
  {
    id: '3',
    nombre: 'Uñas Acrílicas y Nail Art Premium',
    descripcion: 'Técnicas avanzadas de aplicación de acrílico, gel esculpido y diseños de nail art de alta gama. Aprende las últimas tendencias en manicura de lujo.',
    categoria: 'Manicure',
    nivel: 'Básico',
    precio: 95,
    precioOriginal: 130,
    imagen: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&h=500&fit=crop',
    fechaInicio: '2026-08-05',
    fechaFin: '2026-08-08',
    horario: '9:00 AM - 1:00 PM',
    ubicacion: 'Centro de Convenciones Crowne Plaza, San Salvador',
    departamento: "San Salvador",
    municipio: "San Salvador",
    lat: 13.7061,
    lng: -89.2016,
    cupoMaximo: 25,
    inscritos: 8,
    instructor: 'Diana Herrera',
    instructorBio: 'Nail artist certificada por OPI y CND. Ganadora del NailPro Competition 2024.',
    estado: 'abierto',
    tags: ['Práctico', 'Kit incluido'],
    fechaRegistro: '2026-06-10',
  },
  {
    id: '4',
    nombre: 'Maquillaje Profesional para Novias',
    descripcion: 'Técnicas de maquillaje bridal de alta duración, trabajando con diferentes tipos de piel, iluminación fotográfica y tendencias actuales del mercado nupcial.',
    categoria: 'Maquillaje',
    nivel: 'Intermedio',
    precio: 150,
    imagen: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=500&fit=crop',
    fechaInicio: '2026-08-12',
    fechaFin: '2026-08-14',
    horario: '10:00 AM - 4:00 PM',
    ubicacion: 'Hotel Sheraton Presidente, San Salvador',
    departamento: "San Salvador",
    municipio: "San Salvador",
    lat: 13.7004,
    lng: -89.2033,
    cupoMaximo: 12,
    inscritos: 3,
    instructor: 'Valentina Castro',
    instructorBio: 'Maquillista profesional especializada en eventos de lujo. Colaboradora de revistas de moda internacionales.',
    estado: 'abierto',
    tags: ['Práctico', 'Certificación', 'Material incluido'],
    fechaRegistro: '2026-06-12',
  },
  {
    id: '5',
    nombre: 'Tratamientos Capilares y Spa',
    descripcion: 'Especialización en tratamientos reconstructores, keratina, botox capilar y protocolos de spa para el cuero cabelludo. Incluye diagnóstico tricologico.',
    categoria: 'Tratamientos',
    nivel: 'Avanzado',
    precio: 0,
    imagen: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&h=500&fit=crop',
    fechaInicio: '2026-08-18',
    fechaFin: '2026-08-20',
    horario: '9:00 AM - 2:00 PM',
    ubicacion: 'ACOES Beauty Lab, Santa Tecla, La Libertad',
    departamento: "La Libertad",
    municipio: "Santa Tecla",
    lat: 13.6748,
    lng: -89.2907,
    cupoMaximo: 18,
    inscritos: 0,
    instructor: 'Dr. Roberto Paz',
    instructorBio: 'Tricólogo certificado. Especialista en ciencias cosméticas con enfoque en salud capilar.',
    estado: 'proximamente',
    tags: ['Gratuito', 'Práctico', 'Certificación médica'],
    fechaRegistro: '2026-06-15',
  },
  {
    id: '6',
    nombre: 'Barbería Clásica y Moderna',
    descripcion: 'Técnicas de barbería tradicional con navaja, fades precisos, diseños con tijera y cuidado de barba. Incluye gestión de barbershop.',
    categoria: 'Barbería',
    nivel: 'Intermedio',
    precio: 110,
    imagen: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&h=500&fit=crop',
    fechaInicio: '2026-08-25',
    fechaFin: '2026-08-27',
    horario: '1:00 PM - 6:00 PM',
    ubicacion: 'The Barber House, Zona Rosa, San Salvador',
    departamento: "San Salvador",
    municipio: "San Salvador",
    lat: 13.6983,
    lng: -89.2252,
    cupoMaximo: 10,
    inscritos: 6,
    instructor: 'Miguel Ángel Santos',
    instructorBio: 'Master Barber con certificación de la American Barber Association. 10 años de experiencia.',
    estado: 'abierto',
    tags: ['Práctico', 'Herramientas incluidas'],
    fechaRegistro: '2026-06-18',
  },
]

export const mockInscripciones: InscripcionCurso[] = [
  { id: '1', cursoId: '1', nombre: 'María Elena Castillo', correo: 'maria.c@email.com', telefono: '7123-4567', dui: '01234567-8', fechaInscripcion: '2026-06-20', estado: 'confirmada', notas: '' },
  { id: '2', cursoId: '1', nombre: 'Carmen Beatriz Reyes', correo: 'carmen.r@email.com', telefono: '7234-5678', dui: '02345678-9', fechaInscripcion: '2026-06-21', estado: 'confirmada', notas: '' },
  { id: '3', cursoId: '2', nombre: 'Rosa Isabel Morales', correo: 'rosa.m@email.com', telefono: '7345-6789', dui: '03456789-0', fechaInscripcion: '2026-06-22', estado: 'confirmada', notas: '' },
]

export const categoriasCursos = [
  'Colorimetría', 'Corte', 'Manicure', 'Maquillaje', 'Tratamientos', 'Barbería', 'Estilismo', 'Spa'
]

export const nivelesCursos = ['Básico', 'Intermedio', 'Avanzado']

export function getCursosFiltrados(categoria?: string, nivel?: string, estado?: string, search?: string): Curso[] {
  let result = [...mockCursos]
  if (categoria) result = result.filter(c => c.categoria === categoria)
  if (nivel) result = result.filter(c => c.nivel === nivel)
  if (estado) result = result.filter(c => c.estado === estado)
  if (search) {
    const s = search.toLowerCase()
    result = result.filter(c => c.nombre.toLowerCase().includes(s) || c.descripcion.toLowerCase().includes(s) || c.categoria.toLowerCase().includes(s))
  }
  return result
}

export function getInscripcionesPorCurso(cursoId: string): InscripcionCurso[] {
  return mockInscripciones.filter(i => i.cursoId === cursoId)
}

export function inscribirACurso(data: Omit<InscripcionCurso, 'id' | 'fechaInscripcion' | 'estado'>): InscripcionCurso {
  const newInscripcion: InscripcionCurso = {
    ...data,
    id: String(mockInscripciones.length + 1),
    fechaInscripcion: new Date().toISOString().split('T')[0],
    estado: 'confirmada',
  }
  mockInscripciones.push(newInscripcion)
  // Update course inscritos
  const curso = mockCursos.find(c => c.id === data.cursoId)
  if (curso) {
    curso.inscritos += 1
    if (curso.inscritos >= curso.cupoMaximo) {
      curso.estado = 'lleno'
    }
  }
  return newInscripcion
}
