import { z } from 'zod';

import {
  getCountryDialCode,
  getValidMunicipalities,
  isValidDepartment,
  participantEducationLevelOptions,
  participantGenderOptions,
  participantRoleFunctionOptions,
  participantStatusOptions,
  participantCountryOptions,
} from './catalogs';

const optionalText = z.union([z.string(), z.literal('')]).optional().transform((value) => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
});

const optionalUrl = z.union([z.string(), z.literal('')]).optional().transform((value) => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
});

const participantBaseShape = {
  courseId: z.coerce.number().int().positive().optional(),
  fullName: z.string().trim().min(2, 'El nombre es obligatorio'),
  documentNumber: z.string().trim().min(3, 'El documento es obligatorio'),
  birthDate: z.string().trim().min(1, 'La fecha de nacimiento es obligatoria'),
  gender: z.enum(participantGenderOptions, { errorMap: () => ({ message: 'Selecciona un género válido' }) }),
  phoneCountry: z.string().trim().min(1, 'Selecciona un país válido'),
  phoneDialCode: z.string().trim().min(1, 'El prefijo es obligatorio'),
  phoneNumber: z.string().trim().min(3, 'El número celular es obligatorio'),
  phone: z.string().trim().min(5, 'El teléfono completo es obligatorio'),
  email: optionalText.refine((value) => !value || z.string().email().safeParse(value).success, {
    message: 'El correo electrónico no es válido',
  }),
  address: optionalText,
  municipality: z.string().trim().min(1, 'Selecciona un municipio válido'),
  department: z.string().trim().min(1, 'Selecciona un departamento válido'),
  district: optionalText,
  organization: optionalText,
  roleFunction: z.enum(participantRoleFunctionOptions, { errorMap: () => ({ message: 'Selecciona una función válida' }) }),
  educationLevel: z.union([z.enum(participantEducationLevelOptions), z.literal('')]).optional().transform((value) => {
    const normalized = typeof value === 'string' ? value.trim() : value;
    return normalized ? normalized : undefined;
  }),
  program: optionalText,
  status: z.enum(participantStatusOptions, { errorMap: () => ({ message: 'Selecciona un estado válido' }) }),
  notes: optionalText,
  consent: z.boolean(),
};

const participantExtendedShape = {
  cardNumber: optionalText,
  photoUrl: optionalUrl,
  coursesCount: z.coerce.number().int().min(0).default(0),
};

const participantBaseObjectSchema = z.object(participantBaseShape);

const participantPublicObjectSchema = participantBaseObjectSchema.superRefine((data, ctx) => {
  if (!participantCountryOptions.some((country) => country.name === data.phoneCountry)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phoneCountry'], message: 'Selecciona un país válido' });
  }

  if (getCountryDialCode(data.phoneCountry) !== data.phoneDialCode) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phoneDialCode'], message: 'El prefijo no coincide con el país seleccionado' });
  }

  if (!isValidDepartment(data.department)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['department'], message: 'Selecciona un departamento válido' });
  }

  if (data.municipality && !getValidMunicipalities(data.department).includes(data.municipality)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['municipality'], message: 'El municipio no corresponde al departamento seleccionado' });
  }
});

/**
 * The base participant object (without the public superRefine). Exported
 * so the dedicated public schema can `.omit().extend()` on it before
 * re-applying its own superRefine for the public role matrix.
 */
export { participantBaseObjectSchema };

export const participantPublicSchema = participantPublicObjectSchema;

export const participantExtendedSchema = participantPublicObjectSchema.and(z.object(participantExtendedShape));

export const participantSubmissionSchema = participantExtendedSchema;

export type ParticipantSubmission = z.infer<typeof participantSubmissionSchema>;

export function extractParticipantSubmission(formData: FormData, defaultStatus: ParticipantSubmission['status']) {
  return {
    courseId: formData.get('courseId') ? Number(formData.get('courseId')) : undefined,
    fullName: String(formData.get('fullName') ?? ''),
    documentNumber: String(formData.get('documentNumber') ?? ''),
    birthDate: String(formData.get('birthDate') ?? ''),
    gender: String(formData.get('gender') ?? ''),
    phoneCountry: String(formData.get('phoneCountry') ?? ''),
    phoneDialCode: String(formData.get('phoneDialCode') ?? ''),
    phoneNumber: String(formData.get('phoneNumber') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    email: String(formData.get('email') ?? ''),
    address: String(formData.get('address') ?? ''),
    municipality: String(formData.get('municipality') ?? ''),
    department: String(formData.get('department') ?? ''),
    district: String(formData.get('district') ?? ''),
    organization: String(formData.get('organization') ?? ''),
    roleFunction: String(formData.get('roleFunction') ?? ''),
    educationLevel: String(formData.get('educationLevel') ?? ''),
    program: String(formData.get('program') ?? ''),
    status: String(formData.get('status') ?? defaultStatus),
    notes: String(formData.get('notes') ?? ''),
    consent: formData.get('consent') ? true : false,
    cardNumber: String(formData.get('cardNumber') ?? ''),
    photoUrl: String(formData.get('photoUrl') ?? ''),
    coursesCount: String(formData.get('coursesCount') ?? 0),
  };
}

export function validateParticipantSubmission(formData: FormData, defaultStatus: ParticipantSubmission['status']) {
  return participantSubmissionSchema.safeParse(extractParticipantSubmission(formData, defaultStatus));
}
