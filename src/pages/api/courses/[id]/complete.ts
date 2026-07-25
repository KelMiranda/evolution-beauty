import type { APIRoute } from 'astro';

import { getCurrentUser } from '../../../../lib/server/auth';
import { ensureDatabase } from '../../../../lib/server/bootstrap';
import { canManageCourses } from '../../../../lib/server/permissions';
import { completeCourse } from '../../../../lib/server/certificates';

export const POST: APIRoute = async ({ params, cookies }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManageCourses(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const id = Number(params.id);
  if (!Number.isFinite(id)) return Response.json({ error: 'Invalid course id' }, { status: 400 });

  const result = await completeCourse(id, user.id);
  if (!result) return Response.json({ error: 'Course not found' }, { status: 404 });

  return Response.json({ data: result }, { status: 201 });
};
