export const elSalvadorDepartments = [
  'Ahuachapán', 'Cabañas', 'Chalatenango', 'Cuscatlán', 'La Libertad',
  'La Paz', 'La Unión', 'Morazán', 'San Miguel', 'San Salvador',
  'San Vicente', 'Santa Ana', 'Sonsonate', 'Usulután',
] as const;

export const municipalitiesByDepartment: Record<string, string[]> = {
  'Ahuachapán': ['Ahuachapán', 'Atiquizaya', 'Concepción de Ataco', 'Apaneca', 'Turín'],
  'Cabañas': ['Sensuntepeque', 'Ilobasco', 'Victoria', 'Cinquera', 'Dolores'],
  'Chalatenango': ['Chalatenango', 'Nueva Concepción', 'La Palma', 'Suchitoto', 'Tejutla'],
  'Cuscatlán': ['Cojutepeque', 'Suchitoto', 'Santa Cruz Analquito', 'San José Guayabal'],
  'La Libertad': ['Santa Tecla', 'Colón', 'Antiguo Cuscatlán', 'Quezaltepeque', 'Zaragoza'],
  'La Paz': ['Zacatecoluca', 'Olocuilta', 'San Luis Talpa', 'Santiago Nonualco'],
  'La Unión': ['La Unión', 'Santa Rosa de Lima', 'Pasaquina', 'Conchagua'],
  'Morazán': ['San Francisco Gotera', 'Osicala', 'Perquín', 'Jocoaitique'],
  'San Miguel': ['San Miguel', 'Chinameca', 'Carolina', 'Moncagua', 'Ciudad Barrios'],
  'San Salvador': ['San Salvador', 'Soyapango', 'Mejicanos', 'Apopa', 'Ilopango', 'Santa Tecla'],
  'San Vicente': ['San Vicente', 'Apastepeque', 'Santo Domingo', 'Tecoluca'],
  'Santa Ana': ['Santa Ana', 'Metapán', 'Chalchuapa', 'Coatepeque', 'Texistepeque'],
  'Sonsonate': ['Sonsonate', 'Izalco', 'Nahuizalco', 'Acajutla', 'Juayúa'],
  'Usulután': ['Usulután', 'Jiquilisco', 'Puerto El Triunfo', 'Berlín', 'Alegría'],
};
