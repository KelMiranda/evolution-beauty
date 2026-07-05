import { z } from 'zod';
import { canonicalRoles, type CanonicalRole } from './permissions';

export const userSubmissionSchema = z.object({
  email: z.string().email('El correo electrónico no es válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  fullName: z.string().trim().min(2, 'El nombre es obligatorio'),
  role: z.enum(canonicalRoles, { errorMap: () => ({ message: 'Selecciona un rol válido' }) }),
  active: z.boolean(),
});

export type UserInput = z.infer<typeof userSubmissionSchema>;

export type UserPatch = Partial<Omit<UserInput, 'password'>> & { password?: string };

export function extractUserSubmission(formData: FormData): UserInput & { password?: string } {
  return {
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
    fullName: String(formData.get('fullName') ?? ''),
    role: String(formData.get('role') ?? '') as CanonicalRole,
    active: formData.get('active') === 'true' || formData.get('active') === 'on',
  };
}

export function validateUserSubmission(formData: FormData): ReturnType<typeof userSubmissionSchema['safeParse']> {
  return userSubmissionSchema.safeParse(extractUserSubmission(formData));
}
