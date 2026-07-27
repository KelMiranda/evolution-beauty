import { z } from 'zod';

// Mirrors `src/lib/server/dui.ts` so the public registration form can normalize
// DUI input on the client. The backend's `duiSchema` already does this server
// side; the client-side call is a defensive measure that keeps the payload on
// the canonical `00000000-0` form before submit and is also used by the modal
// enrollment form in `CursoDetallePage` (PR3).
const DUI_CANONICAL = /^\d{8}-\d$/;
const DUI_NINE_DIGITS = /^\d{9}$/;

/**
 * Normalize a raw DUI input to the canonical Salvadoran format `00000000-0`.
 *
 * - Strips all whitespace and control characters.
 * - Returns the canonical form when input already matches `^\d{8}-\d$`.
 * - Inserts the dash when input is exactly nine contiguous digits.
 * - Returns `null` for any other input (wrong length, letters, symbols, etc.).
 *
 * See `openspec/changes/acoes-dui-enrollment-flow/specs/dui-format-validation/spec.md`.
 */
export function normalizeDui(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.replace(/\s+/g, '').replace(/[\u0000-\u001f\u007f]/g, '');
  if (DUI_CANONICAL.test(trimmed)) return trimmed;
  if (DUI_NINE_DIGITS.test(trimmed)) return `${trimmed.slice(0, 8)}-${trimmed.slice(8)}`;
  return null;
}

/**
 * Zod schema that first normalizes via `normalizeDui` and then validates the
 * canonical regex. The preprocessor guarantees the parsed value is always
 * `00000000-0` when validation passes.
 *
 * Mirrors the backend's `duiSchema` (`src/lib/server/dui.ts`) using the Zod v4
 * `error` parameter shape (the frontend pins `zod@^4.3.5`).
 */
export const clientDuiSchema = z.preprocess(
  (raw) => normalizeDui(raw),
  z
    .string({ error: 'DUI inválido (formato 00000000-0)' })
    .regex(/^\d{8}-\d$/, { error: 'DUI inválido (formato 00000000-0)' }),
);

/**
 * Format a DUI input string the way it should appear in the field as the
 * user types. Auto-inserts the dash after the eighth digit so the user
 * never has to type it. Strips non-digit characters; truncates to the
 * canonical 10-character form (`00000000-0`). Pasting the canonical form,
 * the dashed form, or nine contiguous digits all produce the canonical
 * output. Pasting more than nine digits is truncated (the extra digits
 * are dropped); pasting fewer than nine yields the partial canonical
 * representation (e.g. `04660171` stays `04660171`, `046601718` becomes
 * `04660171-8`).
 *
 * Use as the `onChange` transform on the DUI input.
 */
export function formatDuiInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 8) return digits;
  return `${digits.slice(0, 8)}-${digits.slice(8)}`;
}