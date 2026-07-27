import type { Registro } from '@/types'

/**
 * Pure helper used by the dashboard's Facilitadores panel to split the
 * `registros` array into a "linked to a course" bucket and a
 * "pending assignment" bucket.
 *
 * Canonical role per PR2 is `'Facilitador'` (singular, masculine-default);
 * we keep the lowercase fallback so historical admin rows that pre-date
 * PR2 still appear in the right bucket.
 *
 * The buckets are filtered from the SPA's `Registro` array — `Registro.courseId`
 * is optional, so truthiness on `courseId` mirrors the backend's
 * `participants.course_id IS NOT NULL` filter without a second round-trip.
 *
 * Returned shape is a plain object so consumers can render two sub-tables
 * without recomputing the filter.
 */
export function splitFacilitadores(registros: Registro[]): {
  linked: Registro[]
  unlinked: Registro[]
} {
  const all = registros.filter(
    r => r.funcion === 'Facilitador' || r.funcion === 'facilitador',
  )
  return {
    linked: all.filter(r => Boolean(r.courseId)),
    unlinked: all.filter(r => !r.courseId),
  }
}
