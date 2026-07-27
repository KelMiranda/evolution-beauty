import { z } from 'zod';

import { PUBLIC_PARTICIPANT_ROLE_OPTIONS } from './catalogs';
import { duiSchema } from './dui';
import { participantBaseObjectSchema } from './participant-schema';

/**
 * Public submission schema for `POST /api/public/participants`.
 *
 * Built on top of the shared `participantBaseObjectSchema` so we reuse
 * every geographic, phone, and consent check, but with these public-only
 * differences:
 *
 * 1. `roleFunction` is restricted to the public two-value catalog
 *    (`Participante` | `Facilitador`). The admin four-value catalog
 *    (which includes `Empleado` and `Otro`) is intentionally NOT reused.
 * 2. `documentNumber` is normalized through `duiSchema`, so the value
 *    persisted and returned to the client is always canonical
 *    `00000000-0` (or rejected).
 * 3. `notes` is omitted and replaced with `z.undefined().optional()` so a
 *    malformed client cannot leak public observations into the participants
 *    table. `courseId` and `program` are required only when
 *    `roleFunction === 'Facilitador'` via a `superRefine` block.
 * 4. `phone` is synthesized from `phone_dial_code` + `phone_number` when the
 *    wire payload omits it (or sends `''`). The public SPA collects `prefijo`
 *    and `celular` as separate fields; this preprocess keeps the schema
 *    self-contained so the wire shape matches what the rest of the
 *    `participantBaseObjectSchema` expects.
 *
 * See `openspec/changes/acoes-dui-enrollment-flow/specs/public-registration-enum-funcion/spec.md`
 * and `specs/dui-format-validation/spec.md`.
 */

const phoneMinLength = 5;

/**
 * Combine `phone_dial_code` + `phone_number` into a single `phone` string
 * when the wire payload omits it or sends `''`. The preprocess runs BEFORE
 * validation so the downstream `phone: z.string().trim().min(5, ...)` chain
 * sees the canonical combined form.
 *
 * Defensive copy: only acts on plain object payloads; everything else falls
 * through unchanged so the schema's own type-narrowing still rejects
 * malformed bodies.
 */
function synthesizePhoneIfMissing(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw;
  const obj = { ...(raw as Record<string, unknown>) };
  const phoneValue = obj.phone;
  const phoneMissing =
    phoneValue === undefined ||
    phoneValue === null ||
    (typeof phoneValue === 'string' && phoneValue.trim() === '');
  if (!phoneMissing) return obj;

  // The public endpoint accepts both camelCase (used by the SPA after the
  // route handler's `pickString` normalization) and snake_case (used by
  // direct API clients). Read either alias so the preprocess works in both
  // shapes.
  const prefijoRaw =
    typeof obj.phoneDialCode === 'string'
      ? obj.phoneDialCode
      : typeof obj.phone_dial_code === 'string'
        ? obj.phone_dial_code
        : '';
  const numeroRaw =
    typeof obj.phoneNumber === 'string'
      ? obj.phoneNumber
      : typeof obj.phone_number === 'string'
        ? obj.phone_number
        : '';
  const prefijo = prefijoRaw.trim();
  const numero = numeroRaw.trim();
  const combined = `${prefijo} ${numero}`.trim();
  if (combined) {
    obj.phone = combined;
  } else {
    // Make sure the schema sees a missing field rather than an empty string
    // when neither component is available — keeps the error message aligned
    // with `phoneNumber` / `phoneDialCode` failures.
    delete obj.phone;
  }
  return obj;
}

export const publicParticipantSubmissionSchema = z.preprocess(
  synthesizePhoneIfMissing,
  participantBaseObjectSchema
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
      // Tighten `courseId` so an absent value short-circuits to undefined
      // BEFORE Zod's `.coerce.number()` produces a `NaN`. The previous
      // `z.coerce.number().int().positive().optional()` chain let NaN slip
      // through to `.int()` and surfaced as a confusing `courseId` error
      // even when the public caller had no intent to send a course id.
      // `pickNumber` returns 0 when the field is missing from the body,
      // so we treat 0 as "no course provided" — matching the optional
      // semantics a public registration wants.
      courseId: z.preprocess(
        (value) => {
          if (value === undefined || value === null || value === '' || value === 0) return undefined;
          const parsed = typeof value === 'number' ? value : Number(value);
          return Number.isFinite(parsed) ? parsed : value;
        },
        z.number().int().positive().optional(),
      ),
      program: z.string().trim().min(1).optional(),
    })
    .superRefine((data, ctx) => {
      if (data.roleFunction === 'Facilitador') {
        // `courseId` is optional for everyone: a Facilitador may not have a
        // specific course in mind yet, and the participant is allowed to
        // exist without a preferred course. The form still surfaces the
        // dropdown for Facilitadores (so they can pick one when relevant);
        // the schema no longer blocks submission when they don't.
        if (!data.program || !data.program.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['program'],
            message: 'Describe la capacitación',
          });
        }
      }
    }),
);

export type PublicParticipantSubmission = z.infer<typeof publicParticipantSubmissionSchema>;

/**
 * Re-export the minimum-length contract so the route handler's tests can
 * assert against the same constant when checking the synthesized phone.
 */
export const PUBLIC_PHONE_MIN_LENGTH = phoneMinLength;
