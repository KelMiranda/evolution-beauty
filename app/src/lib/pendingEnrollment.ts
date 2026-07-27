/**
 * Tab-bound session bridge for the public enrollment round-trip.
 *
 * When the public enrollment endpoint reports an unknown DUI, the SPA stores
 * the user's intent here and navigates to the registration page. After
 * registration completes and the SPA lands back on the course, the
 * `CursoDetallePage` reads the entry, pre-fills the DUI field, opens the
 * modal, and auto-submits the enrollment.
 *
 * The bridge is intentionally tab-bound (sessionStorage, not localStorage)
 * so a separate tab or browser instance never resumes a stale flow.
 *
 * See `openspec/changes/acoes-dui-enrollment-flow/specs/public-enrollment-by-dui/spec.md`
 * (SPA resume requirement) and `openspec/changes/acoes-dui-enrollment-flow/specs/redirect-after-registration/spec.md`.
 */

const KEY = 'acoes:pendingEnrollment';
const TTL_MS = 10 * 60_000;

export type PendingEnrollment = {
  token: string;
  dui: string;
  courseId: string;
  ts: number;
};

export function savePending(input: Omit<PendingEnrollment, 'ts'> & { ts?: number }): void {
  const entry: PendingEnrollment = { ...input, ts: input.ts ?? Date.now() };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(entry));
  } catch {
    // sessionStorage may be disabled (private mode, quota exceeded). The
    // round-trip will fall back to a fresh manual enrollment next time.
  }
}

export function loadPending(): PendingEnrollment | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isPendingEntry(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPending(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore — sessionStorage may be disabled.
  }
}

export function isExpired(p: PendingEnrollment, now: number = Date.now()): boolean {
  return now - p.ts > TTL_MS;
}

export function matchesPending(
  p: PendingEnrollment,
  courseId: string,
  token: string,
  now: number = Date.now(),
): boolean {
  return p.courseId === courseId && p.token === token && !isExpired(p, now);
}

export const PENDING_ENROLLMENT_KEY = KEY;
export const PENDING_ENROLLMENT_TTL_MS = TTL_MS;

function isPendingEntry(value: unknown): value is PendingEnrollment {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.token === 'string' &&
    typeof v.dui === 'string' &&
    typeof v.courseId === 'string' &&
    typeof v.ts === 'number' &&
    Number.isFinite(v.ts)
  );
}