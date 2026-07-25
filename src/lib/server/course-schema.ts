import { z } from 'zod';

import {
  courseCategoryOptions,
  courseLevelOptions,
  courseStateOptions,
  enrollmentStateOptions,
} from './catalogs';

const optionalText = z.union([z.string(), z.literal('')]).optional().transform((value) => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
});

const tagsArray = z.union([
  z.string().transform((value) => value.split(',').map((s) => s.trim()).filter(Boolean)),
  z.array(z.string()),
]).optional().default([]);

export const courseSubmissionSchema = z.object({
  name: z.string().trim().min(2, 'El nombre del curso es obligatorio'),
  description: z.string().trim().min(10, 'La descripción debe tener al menos 10 caracteres'),
  category: z.enum(courseCategoryOptions, { errorMap: () => ({ message: 'Selecciona una categoría válida' }) }),
  level: z.enum(courseLevelOptions, { errorMap: () => ({ message: 'Selecciona un nivel válido' }) }),
  facilitatorId: z.union([z.coerce.number().int().positive(), z.literal(''), z.undefined()]).optional().transform((v) => (typeof v === 'number' ? v : undefined)),
  instructor: z.string().trim().min(2, 'El nombre del instructor es obligatorio'),
  instructorBio: optionalText,
  price: z.coerce.number().min(0, 'El precio no puede ser negativo'),
  priceOriginal: z.union([z.coerce.number().min(0), z.literal(''), z.undefined()]).optional().transform((v) => (typeof v === 'number' ? v : undefined)),
  image: z.string().trim().url('La imagen debe ser una URL válida').or(z.literal('')).optional().default(''),
  fechaInicio: z.string().trim().min(1, 'La fecha de inicio es obligatoria'),
  fechaFin: z.string().trim().min(1, 'La fecha de fin es obligatoria'),
  horario: z.string().trim().min(1, 'El horario es obligatorio'),
  ubicacion: z.string().trim().min(2, 'La ubicación es obligatoria'),
  departamento: z.union([z.string().min(1), z.literal(''), z.undefined()]).transform(v => v || undefined),
  municipio: z.union([z.string().min(1), z.literal(''), z.undefined()]).transform(v => v || undefined),
  lat: z.union([z.coerce.number(), z.literal(''), z.undefined()]).optional().transform((v) => (typeof v === 'number' ? v : undefined)),
  lng: z.union([z.coerce.number(), z.literal(''), z.undefined()]).optional().transform((v) => (typeof v === 'number' ? v : undefined)),
  cupoMaximo: z.coerce.number().int().min(1, 'El cupo debe ser al menos 1'),
  estado: z.enum(courseStateOptions, { errorMap: () => ({ message: 'Selecciona un estado válido' }) }),
  tags: tagsArray,
});

// Partial schema for PATCH — all fields optional
const tagsArrayPartial = z.union([
  z.string().transform((value) => value.split(',').map((s) => s.trim()).filter(Boolean)),
  z.array(z.string()),
]).optional();

export const coursePatchSchema = z.object({
  name: optionalText,
  description: optionalText,
  category: z.enum(courseCategoryOptions).optional(),
  level: z.enum(courseLevelOptions).optional(),
  facilitatorId: z.union([z.coerce.number().int().positive(), z.literal(''), z.undefined()]).optional().transform((v) => (typeof v === 'number' ? v : undefined)),
  instructor: optionalText,
  instructorBio: optionalText,
  price: z.coerce.number().min(0).optional(),
  priceOriginal: z.union([z.coerce.number().min(0), z.literal(''), z.undefined()]).optional().transform((v) => (typeof v === 'number' ? v : undefined)),
  image: z.string().trim().url().or(z.literal('')).optional().transform((v) => v || undefined),
  fechaInicio: optionalText,
  fechaFin: optionalText,
  horario: optionalText,
  ubicacion: optionalText,
  departamento: z.union([z.string().min(1), z.literal(''), z.undefined()]).optional().transform(v => v || undefined),
  municipio: z.union([z.string().min(1), z.literal(''), z.undefined()]).optional().transform(v => v || undefined),
  lat: z.union([z.coerce.number(), z.literal(''), z.undefined()]).optional().transform((v) => (typeof v === 'number' ? v : undefined)),
  lng: z.union([z.coerce.number(), z.literal(''), z.undefined()]).optional().transform((v) => (typeof v === 'number' ? v : undefined)),
  cupoMaximo: z.coerce.number().int().min(1).optional(),
  estado: z.enum(courseStateOptions).optional(),
  tags: tagsArrayPartial,
});

export type CourseSubmission = z.infer<typeof courseSubmissionSchema>;

export function extractCourseSubmission(formData: FormData): CourseSubmission {
  const raw = {
    name: String(formData.get('name') ?? ''),
    description: String(formData.get('description') ?? ''),
    category: String(formData.get('category') ?? ''),
    level: String(formData.get('level') ?? ''),
    facilitatorId: formData.get('facilitatorId') ? Number(formData.get('facilitatorId')) : undefined,
    instructor: String(formData.get('instructor') ?? ''),
    instructorBio: String(formData.get('instructorBio') ?? ''),
    price: Number(formData.get('price') ?? 0),
    priceOriginal: formData.get('priceOriginal') ? String(formData.get('priceOriginal')) : undefined,
    image: String(formData.get('image') ?? ''),
    fechaInicio: String(formData.get('fechaInicio') ?? ''),
    fechaFin: String(formData.get('fechaFin') ?? ''),
    horario: String(formData.get('horario') ?? ''),
    ubicacion: String(formData.get('ubicacion') ?? ''),
    departamento: String(formData.get('departamento') ?? ''),
    municipio: String(formData.get('municipio') ?? ''),
    lat: formData.get('lat') ? Number(formData.get('lat')) : undefined,
    lng: formData.get('lng') ? Number(formData.get('lng')) : undefined,
    cupoMaximo: Number(formData.get('cupoMaximo') ?? 0),
    estado: String(formData.get('estado') ?? 'draft'),
    tags: formData.get('tags') ? String(formData.get('tags')) : '',
  };
  // Cast through unknown — schema coercion handles the rest at parse time
  return raw as unknown as CourseSubmission;
}

export function validateCourseSubmission(formData: FormData) {
  return courseSubmissionSchema.safeParse(extractCourseSubmission(formData));
}

export const enrollmentSubmissionSchema = z.object({
  courseId: z.coerce.number().int().positive('ID de curso inválido'),
  participantId: z.coerce.number().int().positive().optional(),
  fullName: z.string().trim().min(2, 'El nombre es obligatorio'),
  email: z.string().trim().email('Correo electrónico inválido'),
  phone: z.string().trim().min(5, 'El teléfono es obligatorio'),
  dui: optionalText,
  notas: optionalText,
});

export type EnrollmentSubmission = z.infer<typeof enrollmentSubmissionSchema>;

export const enrollmentStateTransitionSchema = z.object({
  estado: z.enum(enrollmentStateOptions, { errorMap: () => ({ message: 'Estado inválido' }) }),
});

export type EnrollmentStateTransition = z.infer<typeof enrollmentStateTransitionSchema>;
