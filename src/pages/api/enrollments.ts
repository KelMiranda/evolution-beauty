import type { APIRoute } from 'astro';

import { getCurrentUser } from '../../lib/server/auth';
import { ensureDatabase } from '../../lib/server/bootstrap';
import { canViewEnrollments } from '../../lib/server/permissions';
import { createEnrollment, listEnrollments } from '../../lib/server/enrollments';
import { enrollmentSubmissionSchema } from '../../lib/server/course-schema';
import { normalizeDui } from '../../lib/server/dui';
import { getParticipantByDocumentNumber } from '../../lib/server/participants';

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

  // Admin compatibility shim: when participantId is missing, look up the
  // participant by DUI. If neither is provided, or the DUI does not
  // resolve, return a clear 400 so the admin knows to create the
  // participant first. This is the minimum behavior change to keep the
  // admin path working under the new NOT NULL participant FK.
  let resolvedParticipantId = parsed.data.participantId;
  if (resolvedParticipantId === undefined) {
    const dui = normalizeDui(parsed.data.dui ?? '');
    if (!dui) {
      return new Response(
        JSON.stringify({ error: 'La inscripción administrativa requiere participantId o un DUI que corresponda a un participante existente' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }
    const participant = await getParticipantByDocumentNumber(dui);
    if (!participant) {
      return new Response(
        JSON.stringify({ error: 'No existe un participante con ese DUI. Crealo primero desde el panel administrativo.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }
    resolvedParticipantId = participant.id;
  }

  try {
    const enrollment = await createEnrollment({
      courseId: parsed.data.courseId,
      participantId: resolvedParticipantId,
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
