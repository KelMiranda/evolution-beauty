import type { Registro, User, DashboardStats } from '@/types'

export const mockUser: User = {
  id: '1',
  nombre: 'Administrador ACOES',
  correo: 'admin@acoes.local',
  rol: 'admin',
}

export const mockRegistros: Registro[] = [
  {
    id: '1', codigo: 'ACO-2024-001', nombre: 'María Elena Castillo', dui: '01234567-8',
    fechaNacimiento: '1985-03-15', genero: 'Femenino', pais: 'El Salvador',
    prefijo: '+503', celular: '7123-4567', correo: 'maria.c@email.com',
    direccion: 'Colonia Escalón', distrito: 'San Salvador', departamento: 'San Salvador',
    municipio: 'San Salvador', entidad: 'ACOES Central', funcion: 'Facilitador',
    nivelEducativo: 'Universitario', capacitacion: 'Cosmetología avanzada',
    autorizaDatos: true, observaciones: '', fechaRegistro: '2024-01-15', estado: 'activo',
  },
  {
    id: '2', codigo: 'ACO-2024-002', nombre: 'Carmen Beatriz Reyes', dui: '02345678-9',
    fechaNacimiento: '1990-07-22', genero: 'Femenino', pais: 'El Salvador',
    prefijo: '+503', celular: '7234-5678', correo: 'carmen.r@email.com',
    direccion: 'Colonia San Benito', distrito: 'San Salvador', departamento: 'San Salvador',
    municipio: 'San Salvador', entidad: 'ACOES Central', funcion: 'Participante',
    nivelEducativo: 'Bachillerato', capacitacion: 'Estilismo básico',
    autorizaDatos: true, observaciones: '', fechaRegistro: '2024-01-20', estado: 'activo',
  },
  {
    id: '3', codigo: 'ACO-2024-003', nombre: 'Rosa Isabel Morales', dui: '03456789-0',
    fechaNacimiento: '1978-11-05', genero: 'Femenino', pais: 'El Salvador',
    prefijo: '+503', celular: '7345-6789', correo: 'rosa.m@email.com',
    direccion: 'Colonia Centroamérica', distrito: 'San Miguel', departamento: 'San Miguel',
    municipio: 'San Miguel', entidad: 'ACOES San Miguel', funcion: 'Facilitador',
    nivelEducativo: 'Técnico', capacitacion: 'Manicure y pedicure',
    autorizaDatos: true, observaciones: '', fechaRegistro: '2024-02-01', estado: 'activo',
  },
  {
    id: '4', codigo: 'ACO-2024-004', nombre: 'Ana Lucía Fernández', dui: '04567890-1',
    fechaNacimiento: '1995-01-30', genero: 'Femenino', pais: 'El Salvador',
    prefijo: '+503', celular: '7456-7890', correo: 'ana.f@email.com',
    direccion: 'Colonia Maquilishuat', distrito: 'Santa Ana', departamento: 'Santa Ana',
    municipio: 'Santa Ana', entidad: 'ACOES Occidente', funcion: 'Participante',
    nivelEducativo: 'Secundaria', capacitacion: 'Colorimetría',
    autorizaDatos: true, observaciones: '', fechaRegistro: '2024-02-10', estado: 'activo',
  },
  {
    id: '5', codigo: 'ACO-2024-005', nombre: 'Luisa Margarita Díaz', dui: '05678901-2',
    fechaNacimiento: '1982-09-18', genero: 'Femenino', pais: 'El Salvador',
    prefijo: '+503', celular: '7567-8901', correo: 'luisa.d@email.com',
    direccion: 'Colonia Escalón', distrito: 'La Libertad', departamento: 'La Libertad',
    municipio: 'Santa Tecla', entidad: 'ACOES La Libertad', funcion: 'Empleado',
    nivelEducativo: 'Universitario', capacitacion: 'Administración de salón',
    autorizaDatos: true, observaciones: '', fechaRegistro: '2024-02-15', estado: 'activo',
  },
  {
    id: '6', codigo: 'ACO-2024-006', nombre: 'Patricia Alejandra Ruiz', dui: '06789012-3',
    fechaNacimiento: '1988-05-25', genero: 'Femenino', pais: 'El Salvador',
    prefijo: '+503', celular: '7678-9012', correo: 'patricia.r@email.com',
    direccion: 'Colonia San Francisco', distrito: 'San Salvador', departamento: 'San Salvador',
    municipio: 'Soyapango', entidad: 'ACOES Central', funcion: 'Participante',
    nivelEducativo: 'Bachillerato', capacitacion: 'Maquillaje profesional',
    autorizaDatos: true, observaciones: '', fechaRegistro: '2024-03-01', estado: 'activo',
  },
  {
    id: '7', codigo: 'ACO-2024-007', nombre: 'Diana Michelle Hernández', dui: '07890123-4',
    fechaNacimiento: '1992-12-08', genero: 'Femenino', pais: 'El Salvador',
    prefijo: '+503', celular: '7789-0123', correo: 'diana.h@email.com',
    direccion: 'Colonia Las Palmeras', distrito: 'La Paz', departamento: 'La Paz',
    municipio: 'Zacatecoluca', entidad: 'ACOES La Paz', funcion: 'Facilitador',
    nivelEducativo: 'Técnico', capacitacion: 'Peinados y trenzas',
    autorizaDatos: true, observaciones: '', fechaRegistro: '2024-03-10', estado: 'pendiente',
  },
  {
    id: '8', codigo: 'ACO-2024-008', nombre: 'Evelyn Stephanie Pineda', dui: '08901234-5',
    fechaNacimiento: '1998-04-14', genero: 'Femenino', pais: 'El Salvador',
    prefijo: '+503', celular: '7890-1234', correo: 'evelyn.p@email.com',
    direccion: 'Colonia Ciudad Pacifica', distrito: 'La Libertad', departamento: 'La Libertad',
    municipio: 'Antiguo Cuscatlán', entidad: 'ACOES La Libertad', funcion: 'Participante',
    nivelEducativo: 'Secundaria', capacitacion: 'Cuidado de la piel',
    autorizaDatos: true, observaciones: '', fechaRegistro: '2024-03-20', estado: 'activo',
  },
  {
    id: '9', codigo: 'ACO-2024-009', nombre: 'Sofia Alejandra Vásquez', dui: '09012345-6',
    fechaNacimiento: '1980-08-20', genero: 'Femenino', pais: 'El Salvador',
    prefijo: '+503', celular: '7901-2345', correo: 'sofia.v@email.com',
    direccion: 'Colonia Escalón', distrito: 'San Salvador', departamento: 'San Salvador',
    municipio: 'San Salvador', entidad: 'ACOES Central', funcion: 'Empleado',
    nivelEducativo: 'Universitario', capacitacion: 'Gestión de equipos',
    autorizaDatos: true, observaciones: '', fechaRegistro: '2024-04-01', estado: 'activo',
  },
  {
    id: '10', codigo: 'ACO-2024-010', nombre: 'Gabriela Nicole Mejía', dui: '00123456-7',
    fechaNacimiento: '1993-06-12', genero: 'Femenino', pais: 'El Salvador',
    prefijo: '+503', celular: '7012-3456', correo: 'gabriela.m@email.com',
    direccion: 'Colonia San Mateo', distrito: 'Chalatenango', departamento: 'Chalatenango',
    municipio: 'Chalatenango', entidad: 'ACOES Occidente', funcion: 'Participante',
    nivelEducativo: 'Bachillerato', capacitacion: 'Uñas acrílicas',
    autorizaDatos: true, observaciones: '', fechaRegistro: '2024-04-15', estado: 'activo',
  },
  {
    id: '11', codigo: 'ACO-2024-011', nombre: 'Andrea Carolina Flores', dui: '01239876-5',
    fechaNacimiento: '1987-02-28', genero: 'Femenino', pais: 'El Salvador',
    prefijo: '+503', celular: '7234-8765', correo: 'andrea.f@email.com',
    direccion: 'Colonia San Carlos', distrito: 'San Vicente', departamento: 'San Vicente',
    municipio: 'San Vicente', entidad: 'ACOES Oriente', funcion: 'Facilitador',
    nivelEducativo: 'Técnico', capacitacion: 'Tratamientos capilares',
    autorizaDatos: true, observaciones: '', fechaRegistro: '2024-05-01', estado: 'activo',
  },
  {
    id: '12', codigo: 'ACO-2024-012', nombre: 'Jennifer Paola Lima', dui: '02348765-4',
    fechaNacimiento: '1996-10-03', genero: 'Femenino', pais: 'El Salvador',
    prefijo: '+503', celular: '7345-7654', correo: 'jennifer.l@email.com',
    direccion: 'Colonia Miramonte', distrito: 'San Salvador', departamento: 'San Salvador',
    municipio: 'San Salvador', entidad: 'ACOES Central', funcion: 'Participante',
    nivelEducativo: 'Secundaria', capacitacion: 'Barbería femenina',
    autorizaDatos: true, observaciones: '', fechaRegistro: '2024-05-10', estado: 'pendiente',
  },
  {
    id: '13', codigo: 'ACO-2024-013', nombre: 'Karla Vanessa Aguilar', dui: '03457654-3',
    fechaNacimiento: '1983-07-19', genero: 'Femenino', pais: 'El Salvador',
    prefijo: '+503', celular: '7456-6543', correo: 'karla.a@email.com',
    direccion: 'Colonia Ciudad Corazón', distrito: 'Cuscatlán', departamento: 'Cuscatlán',
    municipio: 'Cojutepeque', entidad: 'ACOES Centro', funcion: 'Facilitador',
    nivelEducativo: 'Universitario', capacitacion: 'Cosmetología integral',
    autorizaDatos: true, observaciones: '', fechaRegistro: '2024-05-20', estado: 'activo',
  },
  {
    id: '14', codigo: 'ACO-2024-014', nombre: 'Linda Michelle Orellana', dui: '04566543-2',
    fechaNacimiento: '1991-11-11', genero: 'Femenino', pais: 'El Salvador',
    prefijo: '+503', celular: '7567-5432', correo: 'linda.o@email.com',
    direccion: 'Colonia San Jacinto', distrito: 'La Unión', departamento: 'La Unión',
    municipio: 'La Unión', entidad: 'ACOES Oriente', funcion: 'Participante',
    nivelEducativo: 'Bachillerato', capacitacion: 'Depilación',
    autorizaDatos: true, observaciones: '', fechaRegistro: '2024-06-01', estado: 'activo',
  },
  {
    id: '15', codigo: 'ACO-2024-015', nombre: 'Natalie Beatriz Calderón', dui: '05675432-1',
    fechaNacimiento: '1989-03-25', genero: 'Femenino', pais: 'El Salvador',
    prefijo: '+503', celular: '7678-4321', correo: 'natalie.c@email.com',
    direccion: 'Colonia Altos de San Francisco', distrito: 'Ahuachapán', departamento: 'Ahuachapán',
    municipio: 'Ahuachapán', entidad: 'ACOES Occidente', funcion: 'Otro',
    nivelEducativo: 'Técnico', capacitacion: 'Spa y bienestar',
    autorizaDatos: true, observaciones: '', fechaRegistro: '2024-06-10', estado: 'inactivo',
  },
]

export const mockStats: DashboardStats = {
  totalRegistros: 156,
  registrosSemana: 12,
  facilitadoras: 43,
  participantes: 98,
  totalCursos: 6,
  cursosActivos: 3,
  inscripciones: 14,
  cuposDisponibles: 32,
  porGenero: [
    { name: 'Femenino', value: 148 },
    { name: 'Masculino', value: 5 },
    { name: 'Otro', value: 3 },
  ],
  porDepartamento: [
    { name: 'San Salvador', value: 62 },
    { name: 'La Libertad', value: 28 },
    { name: 'Santa Ana', value: 18 },
    { name: 'San Miguel', value: 15 },
    { name: 'La Paz', value: 12 },
    { name: 'Cuscatlán', value: 8 },
    { name: 'Otros', value: 13 },
  ],
  porMes: [
    { mes: 'Ene', cantidad: 18 },
    { mes: 'Feb', cantidad: 22 },
    { mes: 'Mar', cantidad: 15 },
    { mes: 'Abr', cantidad: 20 },
    { mes: 'May', cantidad: 25 },
    { mes: 'Jun', cantidad: 30 },
    { mes: 'Jul', cantidad: 26 },
  ],
  cursosPorCategoria: [
    { name: 'Colorimetría', value: 1 },
    { name: 'Corte', value: 1 },
    { name: 'Manicure', value: 1 },
    { name: 'Maquillaje', value: 1 },
    { name: 'Tratamientos', value: 1 },
    { name: 'Barbería', value: 1 },
  ],
  inscripcionesPorCurso: [
    { name: 'Colorimetría', inscritos: 14, cupo: 20 },
    { name: 'Corte', inscritos: 15, cupo: 15 },
    { name: 'Manicure', inscritos: 8, cupo: 25 },
    { name: 'Maquillaje', inscritos: 3, cupo: 12 },
    { name: 'Tratamientos', inscritos: 0, cupo: 18 },
    { name: 'Barbería', inscritos: 6, cupo: 10 },
  ],
}

export const departamentosElSalvador = [
  'Ahuachapán', 'Cabañas', 'Chalatenango', 'Cuscatlán', 'La Libertad',
  'La Paz', 'La Unión', 'Morazán', 'San Miguel', 'San Salvador',
  'San Vicente', 'Santa Ana', 'Sonsonate', 'Usulután',
]

export const municipiosPorDepartamento: Record<string, string[]> = {
  'Ahuachapán': ['Ahuachapán', 'Apaneca', 'Atiquizaya', 'Concepción de Ataco', 'El Refugio', 'Guaymango', 'Jujutla', 'San Francisco Menéndez', 'San Lorenzo', 'San Pedro Puxtla', 'Tacuba', 'Turín'],
  'Cabañas': ['Cinquera', 'Dolores', 'Guacotecti', 'Ilobasco', 'Jutiapa', 'San Isidro', 'Sensuntepeque', 'Tejutepeque', 'Victoria'],
  'Chalatenango': ['Agua Caliente', 'Arcatao', 'Azacualpa', 'Cancasque', 'Chalatenango', 'Citalá', 'Comalapa', 'Concepción Quezaltepeque', 'Dulce Nombre de María', 'El Carrizal', 'El Paraíso', 'La Laguna', 'La Palma', 'La Reina', 'Las Vueltas', 'Nombre de Jesús', 'Nueva Concepción', 'Nueva Trinidad', 'Ojos de Agua', 'Potonico', 'San Antonio de la Cruz', 'San Antonio Los Ranchos', 'San Fernando', 'San Francisco Lempa', 'San Francisco Morazán', 'San Ignacio', 'San Isidro Labrador', 'San Luis del Carmen', 'San Miguel de Mercedes', 'San Rafael', 'Santa Rita', 'Tejutla'],
  'Cuscatlán': ['Candelaria', 'Cojutepeque', 'El Carmen', 'El Rosario', 'Monte San Juan', 'Oratorio de Concepción', 'San Bartolomé Perulapía', 'San Cristóbal', 'San José Guayabal', 'San Pedro Perulapán', 'San Rafael Cedros', 'San Ramón', 'Santa Cruz Analquito', 'Santa Cruz Michapa', 'Suchitoto', 'Tenancingo'],
  'La Libertad': ['Antiguo Cuscatlán', 'Chiltiupán', 'Ciudad Arce', 'Colón', 'Comasagua', 'Huizúcar', 'Jayaque', 'Jicalapa', 'La Libertad', 'Nuevo Cuscatlán', 'Opico', 'Quezaltepeque', 'Sacacoyo', 'San José Villanueva', 'San Matías', 'San Pablo Tacachico', 'Santa Tecla', 'Talnique', 'Tamanique', 'Teotepeque', 'Tepecoyo', 'Zaragoza'],
  'La Paz': ['Cuyultitán', 'El Rosario', 'Jerusalén', 'Mercedes La Ceiba', 'Olocuilta', 'Paraíso de Osorio', 'San Antonio Masahuat', 'San Emigdio', 'San Francisco Chinameca', 'San Juan Nonualco', 'San Juan Talpa', 'San Juan Tepezontes', 'San Luis La Herradura', 'San Luis Talpa', 'San Miguel Tepezontes', 'San Pedro Masahuat', 'San Pedro Nonualco', 'San Rafael Obrajuelo', 'Santa María Ostuma', 'Santiago Nonualco', 'Tapalhuaca', 'Zacatecoluca'],
  'La Unión': ['Anamorós', 'Bolívar', 'Concepción de Oriente', 'Conchagua', 'El Carmen', 'El Sauce', 'Intipucá', 'La Unión', 'Lislique', 'Meanguera del Golfo', 'Nueva Esparta', 'Pasaquina', 'Polorós', 'San Alejo', 'San José', 'Santa Rosa de Lima', 'Yayantique', 'Yucuaiquín'],
  'Morazán': ['Arambala', 'Cacaopera', 'Chilanga', 'Corinto', 'Delicias de Concepción', 'El Divisadero', 'El Rosario', 'Gualococti', 'Guatajiagua', 'Joateca', 'Jocoaitique', 'Jocoro', 'Lolotiquillo', 'Meanguera', 'Osicala', 'Perquín', 'San Carlos', 'San Fernando', 'San Francisco Gotera', 'San Isidro', 'San Simón', 'Sensembra', 'Sociedad', 'Torola', 'Yamabal', 'Yoloaiquín'],
  'San Miguel': ['Carolina', 'Chapeltique', 'Chinameca', 'Chirilagua', 'Ciudad Barrios', 'Comacarán', 'El Tránsito', 'Lolotique', 'Moncagua', 'Nueva Guadalupe', 'Nuevo Edén de San Juan', 'Quelepa', 'San Antonio', 'San Gerardo', 'San Jorge', 'San Luis de la Reina', 'San Miguel', 'San Rafael Oriente', 'Sesori', 'Uluazapa'],
  'San Salvador': ['Aguilares', 'Apopa', 'Ayutuxtepeque', 'Cuscatancingo', 'Delgado', 'El Paisnal', 'Guazapa', 'Ilopango', 'Mejicanos', 'Nejapa', 'Panchimalco', 'Rosario de Mora', 'San Marcos', 'San Martín', 'San Salvador', 'Santiago Texacuangos', 'Santo Tomás', 'Soyapango', 'Tonacatepeque'],
  'San Vicente': ['Apastepeque', 'Guadalupe', 'San Cayetano Istepeque', 'San Esteban Catarina', 'San Ildefonso', 'San Lorenzo', 'San Sebastián', 'San Vicente', 'Santa Clara', 'Santo Domingo', 'Tecoluca', 'Tepetitán', 'Verapaz'],
  'Santa Ana': ['Candelaria de la Frontera', 'Chalchuapa', 'Coatepeque', 'El Congo', 'El Porvenir', 'Masahuat', 'Metapán', 'San Antonio Pajonal', 'San Sebastián Salitrillo', 'Santa Ana', 'Santa Rosa Guachipilín', 'Santiago de la Frontera', 'Texistepeque'],
  'Sonsonate': ['Acajutla', 'Armenia', 'Caluco', 'Cuisnahuat', 'Izalco', 'Juayúa', 'Nahuizalco', 'Nahulingo', 'Nejapa', 'Nahuilingo', 'Salcoatitán', 'San Antonio del Monte', 'San Julián', 'Santa Catarina Masahuat', 'Santa Isabel Ishuatán', 'Santo Domingo de Guzmán', 'Sonsonate', 'Sonzacate'],
  'Usulután': ['Alegría', 'Berlín', 'California', 'Concepción Batres', 'El Triunfo', 'Ereguayquín', 'Estanzuelas', 'Jiquilisco', 'Jucuapa', 'Jucuarán', 'Mercedes Umaña', 'Nueva Granada', 'Ozatlán', 'Puerto El Triunfo', 'San Agustín', 'San Buenaventura', 'San Dionisio', 'San Francisco Javier', 'Santa Elena', 'Santa María', 'Santiago de María', 'Tecapán', 'Usulután'],
}

// PR4 housekeeping: canonicalized to the public two-value option. The admin
// four-value catalog (`['Empleado', 'Facilitador', 'Participante', 'Otro']`)
// lives in `src/lib/server/catalogs.ts` (`participantRoleFunctionOptions`)
// and is the source of truth for the admin path; the SPA mirrors only the
// public subset here. Historical `Facilitadora` strings remain valid in the
// database and on the admin surface — the column has no DB CHECK and the
// admin schema keeps accepting the legacy value.
export const funcionesACOES = ['Empleado', 'Facilitador', 'Participante', 'Otro']

export const nivelesEducativos = [
  'Sin escolaridad', 'Primaria', 'Secundaria', 'Bachillerato',
  'Técnico', 'Universitario', 'Posgrado', 'Otro',
]

export const paisesCentroamerica = [
  'Guatemala', 'El Salvador', 'Honduras', 'Nicaragua',
  'Costa Rica', 'Panamá', 'Belice',
]
