import type { APIRoute } from 'astro';

import { getCurrentUser } from '../../../../lib/server/auth';
import { ensureDatabase } from '../../../../lib/server/bootstrap';
import { canViewCourses } from '../../../../lib/server/permissions';
import { generateCourseEnrollmentToken, getCourseById } from '../../../../lib/server/courses';
import { query } from '../../../../lib/server/db';

export const POST: APIRoute = async ({ params, cookies }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  if (!canViewCourses(user)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return new Response(JSON.stringify({ error: 'Invalid course id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const course = await getCourseById(id, { includeHidden: true });
  if (!course) {
    return new Response(JSON.stringify({ error: 'Course not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const token = course.public_enrollment_token ?? generateCourseEnrollmentToken(course.id, course.instructor);

  let publicToken: string;
  try {
    const result = await query<{ public_enrollment_token: string }>(
      'UPDATE courses SET public_enrollment_token = $2, updated_at = NOW() WHERE id = $1 RETURNING public_enrollment_token',
      [course.id, token],
    );
    publicToken = result.rows[0]?.public_enrollment_token ?? token;
  } catch (error) {
    console.error('[public-link] failed to persist public enrollment token', {
      courseId: course.id,
      reason: error instanceof Error ? error.message : 'unknown',
    });
    return new Response(JSON.stringify({ error: 'Failed to generate public enrollment token' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Defensive: token should never be empty, but reject if it is so we never
  // return a URL that would let an end-user self-enroll without an identifier.
  if (!publicToken) {
    console.error('[public-link] generated public enrollment token was empty', { courseId: course.id });
    return new Response(JSON.stringify({ error: 'Failed to generate public enrollment token' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // The SPA uses HashRouter (see app/src/main.tsx), so the route must live
  // after the '#' fragment. The base URL is the SPA's user-facing origin,
  // NOT the backend — see docs/architecture.md for rationale.
  const spaBase = (process.env.PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
  const search = new URLSearchParams({ token: publicToken });
  const publicUrl = `${spaBase}/#/cursos/${course.id}?${search.toString()}`;

  return new Response(JSON.stringify({ data: { token: publicToken, publicUrl } }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
