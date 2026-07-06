import type { APIRoute } from 'astro';

import { getCurrentUser } from '../../lib/server/auth';
import { ensureDatabase } from '../../lib/server/bootstrap';
import { canViewEnrollments } from '../../lib/server/permissions';
import { createEnrollment, listEnrollments } from '../../lib/server/enrollments';
import { enrollmentSubmissionSchema } from '../../lib/server/course-schema';

export const GET: APIRoute = async ({ url, cookies }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!canViewEnrollments(user)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const courseIdParam = url.searchParams.get('courseId');
  const participantIdParam = url.searchParams.get('participantId');

  const courseId = courseIdParam ? Number(courseIdParam) : undefined;
  const participantId = participantIdParam ? Number(participantIdParam) : undefined;

  if (courseIdParam && isNaN(courseId as number)) {
    return new Response(JSON.stringify({ error: 'Invalid courseId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (participantIdParam && isNaN(participantId as number)) {
    return new Response(JSON.stringify({ error: 'Invalid participantId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const enrollments = await listEnrollments({
    courseId: courseId as number | undefined,
    participantId: participantId as number | undefined,
  });

  return new Response(JSON.stringify({ data: enrollments }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parsed = enrollmentSubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Datos inválidos', details: parsed.error.flatten() }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const enrollment = await createEnrollment({
      courseId: parsed.data.courseId,
      participantId: parsed.data.participantId,
      enrolledBy: user.id,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      dui: parsed.data.dui,
      notas: parsed.data.notas,
    });

    return new Response(JSON.stringify({ data: enrollment }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error creating enrollment';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
