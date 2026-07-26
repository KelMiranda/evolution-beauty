import { z } from 'zod';

import { PUBLIC_PARTICIPANT_ROLE_OPTIONS } from './catalogs';
import { duiSchema } from './dui';
import { participantBaseObjectSchema } from './participant-schema';

/**
 * Public submission schema for `POST /api/public/participants`.
 *
 * Built on top of the shared `participantPublicObjectSchema` so we reuse
 * every geographic, phone, and consent check, but with three public-only
 * differences:
 *
 * 1. `roleFunction` is restricted to the public two-value catalog
 *    (`Participante` | `Facilitador`). The admin four-value catalog
 *    (which includes `Empleado` and `Otro`) is intentionally NOT reused.
 * 2. `documentNumber` is normalized through `duiSchema`, so the value
 *    persisted and returned to the client is always canonical
 *    `00000000-0` (or rejected).
 * 3. `notes` is omitted and replaced with `z.undefined().optional()` so
 *    a malformed client cannot leak public observations into the
 *    participants table. `courseId` and `program` are required only when
 *    `roleFunction === 'Facilitador'` via a `superRefine` block.
 *
 * See `openspec/changes/acoes-dui-enrollment-flow/specs/public-registration-enum-funcion/spec.md`
 * and `specs/dui-format-validation/spec.md`.
 */
export const publicParticipantSubmissionSchema = participantBaseObjectSchema
  .omit({ roleFunction: true, notes: true, courseId: true, program: true })
  .extend({
    roleFunction: z.enum(PUBLIC_PARTICIPANT_ROLE_OPTIONS, {
      errorMap: () => ({ message: 'Solo se permite Participante o Facilitador' }),
    }),
    documentNumber: duiSchema,
    // Public clients may send `notes: ''` for backward compatibility, but
    // any non-empty string is rejected with a clear "no notes" error and
    // the route handler never forwards a `notes` field to the participant.
    notes: z
      .union([z.literal(''), z.undefined()])
      .optional()
      .transform(() => undefined),
    courseId: z.coerce.number().int().positive().optional(),
    program: z.string().trim().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.roleFunction === 'Facilitador') {
      if (data.courseId === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['courseId'],
          message: 'Selecciona el curso que impartirás',
        });
      }
      if (!data.program || !data.program.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['program'],
          message: 'Describe la capacitación',
        });
      }
    }
  });

export type PublicParticipantSubmission = z.infer<typeof publicParticipantSubmissionSchema>;
