export const centralAmericaCountries = [
  { code: 'GT', name: 'Guatemala', dialCode: '+502' },
  { code: 'SV', name: 'El Salvador', dialCode: '+503' },
  { code: 'HN', name: 'Honduras', dialCode: '+504' },
  { code: 'NI', name: 'Nicaragua', dialCode: '+505' },
  { code: 'CR', name: 'Costa Rica', dialCode: '+506' },
  { code: 'PA', name: 'Panamá', dialCode: '+507' },
  { code: 'BZ', name: 'Belice', dialCode: '+501' },
] as const;

export const elSalvadorDepartments = [
  'Ahuachapán',
  'Cabañas',
  'Chalatenango',
  'Cuscatlán',
  'La Libertad',
  'La Paz',
  'La Unión',
  'Morazán',
  'San Miguel',
  'San Salvador',
  'San Vicente',
  'Santa Ana',
  'Sonsonate',
  'Usulután',
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

export function getDialCode(countryName: string) {
  return centralAmericaCountries.find((country) => country.name === countryName)?.dialCode ?? '+503';
}

export function getMunicipalities(department: string) {
  return municipalitiesByDepartment[department] ?? [];
}
