import { z } from 'zod';

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
 * The function is intentionally a pure string transform so it can be used
 * before the Zod schema runs and before the participant lookup. See the
 * `dui-format-validation` spec in `openspec/changes/acoes-dui-enrollment-flow/specs/dui-format-validation/spec.md`.
 */
export function normalizeDui(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.replace(/\s+/g, '').replace(/[\u0000-\u001f\u007f]/g, '');

  if (DUI_CANONICAL.test(trimmed)) return trimmed;
  if (DUI_NINE_DIGITS.test(trimmed)) return `${trimmed.slice(0, 8)}-${trimmed.slice(8)}`;
  return null;
}

/**
 * Zod schema that first normalizes the input via `normalizeDui` and then
 * validates the canonical regex. The preprocessor guarantees the parsed
 * value is always `00000000-0` when validation passes.
 *
 * Uses `z.string({ invalid_type_error })` so that when the normalizer
 * returns `null` (invalid input), the validator reports a clear
 * `DUI inválido` message instead of Zod's generic "Expected string".
 */
export const duiSchema = z.preprocess(
  (raw) => normalizeDui(raw),
  z
    .string({ required_error: 'DUI inválido (formato 00000000-0)', invalid_type_error: 'DUI inválido (formato 00000000-0)' })
    .regex(/^\d{8}-\d$/, { message: 'DUI inválido (formato 00000000-0)' }),
);
