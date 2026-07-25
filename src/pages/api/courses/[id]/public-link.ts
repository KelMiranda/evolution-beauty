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
  const result = await query<{ public_enrollment_token: string }>(
    'UPDATE courses SET public_enrollment_token = $2, updated_at = NOW() WHERE id = $1 RETURNING public_enrollment_token',
    [course.id, token],
  );

  const publicToken = result.rows[0]?.public_enrollment_token ?? token;
  const publicUrl = new URL(`/cursos/${course.id}`, process.env.PUBLIC_SITE_URL ?? 'http://localhost:4321');
  publicUrl.searchParams.set('token', publicToken);

  return new Response(JSON.stringify({ data: { token: publicToken, publicUrl: publicUrl.toString() } }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
