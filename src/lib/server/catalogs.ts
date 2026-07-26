import { centralAmericaCountries, elSalvadorDepartments, municipalitiesByDepartment } from '../geo';

export const participantGenderOptions = ['Femenino', 'Masculino'] as const;

export const participantRoleFunctionOptions = ['Empleado', 'Facilitador', 'Participante', 'Otro'] as const;

// Public registration exposes only Participante and Facilitador; the admin
// four-value catalog above remains untouched so admin paths can still
// persist Empleado, Otro, and historical Facilitadora. See the
// `public-registration-enum-funcion` spec.
export const PUBLIC_PARTICIPANT_ROLE_OPTIONS = ['Participante', 'Facilitador'] as const;

export const participantEducationLevelOptions = [
  'Sin escolaridad',
  'Primaria',
  'Secundaria',
  'Bachillerato',
  'Técnico',
  'Universitario',
  'Posgrado',
  'Otro',
] as const;

export const participantStatusOptions = ['Activo', 'Pendiente', 'Revisar'] as const;

export const participantLifecycleOptions = ['active', 'inactive'] as const;

export const participantCountryOptions = centralAmericaCountries;
export { elSalvadorDepartments, municipalitiesByDepartment };

export type ParticipantGender = (typeof participantGenderOptions)[number];
export type ParticipantRoleFunction = (typeof participantRoleFunctionOptions)[number];
export type ParticipantEducationLevel = (typeof participantEducationLevelOptions)[number];
export type ParticipantStatus = (typeof participantStatusOptions)[number];
export type ParticipantLifecycleState = (typeof participantLifecycleOptions)[number];

export const courseCategoryOptions = [
  'Colorimetría',
  'Corte',
  'Manicure',
  'Maquillaje',
  'Tratamientos',
  'Barbería',
  'Estilismo',
  'Spa',
] as const;

export const courseLevelOptions = ['Básico', 'Intermedio', 'Avanzado'] as const;

export const courseStateOptions = ['draft', 'published', 'enrolling', 'full', 'in_progress', 'completed', 'cancelled'] as const;

export type CourseCategory = (typeof courseCategoryOptions)[number];
export type CourseLevel = (typeof courseLevelOptions)[number];
export type CourseState = (typeof courseStateOptions)[number];

export const enrollmentStateOptions = ['pending', 'confirmed', 'duplicate_review', 'cancelled', 'withdrawn'] as const;

export const roleCatalog = ['admin', 'empleado', 'facilitador', 'participante'] as const;
export const functionCatalog = participantRoleFunctionOptions;
export const genderCatalog = participantGenderOptions;
export const educationCatalog = participantEducationLevelOptions;
export const lifecycleCatalog = participantLifecycleOptions;
export const geoCatalog = {
  countries: participantCountryOptions,
  departments: elSalvadorDepartments,
  municipalitiesByDepartment,
} as const;

export type EnrollmentState = (typeof enrollmentStateOptions)[number];

export function getCountryDialCode(countryName: string) {
  return participantCountryOptions.find((country) => country.name === countryName)?.dialCode ?? '+503';
}

export function isValidDepartment(department: string) {
  return elSalvadorDepartments.includes(department as (typeof elSalvadorDepartments)[number]);
}

export function getValidMunicipalities(department: string) {
  return municipalitiesByDepartment[department] ?? [];
}
