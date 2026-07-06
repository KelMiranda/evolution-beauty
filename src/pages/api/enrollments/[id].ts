import type { APIRoute } from 'astro';

import { getCurrentUser } from '../../../lib/server/auth';
import { ensureDatabase } from '../../../lib/server/bootstrap';
import { canManageEnrollments } from '../../../lib/server/permissions';
import { cancelEnrollment, getEnrollmentById, updateEnrollmentState } from '../../../lib/server/enrollments';
import { enrollmentStateTransitionSchema } from '../../../lib/server/course-schema';

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  if (!canManageEnrollments(user)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return new Response(JSON.stringify({ error: 'Invalid enrollment id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const existing = await getEnrollmentById(id);
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Enrollment not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const parsed = enrollmentStateTransitionSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const enrollment = await updateEnrollmentState(id, parsed.data.estado, user.id);
    return new Response(JSON.stringify({ data: enrollment }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error updating enrollment' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  if (!canManageEnrollments(user)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return new Response(JSON.stringify({ error: 'Invalid enrollment id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const existing = await getEnrollmentById(id);
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Enrollment not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const enrollment = await cancelEnrollment(id, user.id);
    return new Response(JSON.stringify({ data: enrollment }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error cancelling enrollment' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
