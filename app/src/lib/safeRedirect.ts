/**
 * Validates a `?redirect=` query parameter to prevent open-redirect attacks.
 *
 * Returns the validated relative path or `null` if the value fails any safety
 * check. The helper is intentionally framework-agnostic: it does not depend on
 * React, react-router-dom, or any browser global, so it can be unit-tested
 * directly and reused outside `RegistroPage`.
 *
 * Rejection rules (see `openspec/changes/acoes-dui-enrollment-flow/specs/redirect-after-registration/spec.md`):
 * - Must be a non-empty string.
 * - Must start with a single `/` (a relative path).
 * - Must NOT start with `//` (protocol-relative URL that some browsers treat
 *   as an external origin).
 * - Must NOT contain a scheme prefix (e.g., `http:`, `javascript:`, `data:`,
 *   `vbscript:`) before the first `?` or `#`.
 * - Must NOT contain control characters or whitespace that could enable
 *   header injection or split the path.
 * - Must NOT point back at the registration form itself (`/registro` and any
 *   variant under that prefix) to avoid an infinite redirect loop.
 *
 * The function preserves the trimmed value as-is for accepted inputs so that
 * path-style redirects (`/cursos/9?token=XYZ`, `/cursos/9#schedule`) survive
 * validation unchanged.
 */
export function safeRedirect(input: string | null | undefined): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (trimmed.length < 2) return null;
  if (!trimmed.startsWith('/')) return null;
  if (trimmed.startsWith('//')) return null;
  // Reject control characters and any whitespace (defense against header
  // injection and pasted payloads with hidden characters).
  if (/[\u0000-\u001f\s]/.test(trimmed)) return null;
  // Reject any URL that carries a scheme before the first ? or # fragment.
  const head = trimmed.split(/[?#]/)[0] ?? '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(head)) return null;
  // Self-loop guard: never redirect back into the registration form itself.
  if (
    trimmed === '/registro' ||
    trimmed.startsWith('/registro?') ||
    trimmed.startsWith('/registro#')
  ) {
    return null;
  }
  return trimmed;
}