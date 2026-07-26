import type { APIRoute } from 'astro';

import { ensureDatabase } from '../../../lib/server/bootstrap';
import { getCourseByPublicEnrollmentToken } from '../../../lib/server/courses';
import { createEnrollment } from '../../../lib/server/enrollments';
import { enrollmentSubmissionSchema } from '../../../lib/server/course-schema';
import { duiSchema } from '../../../lib/server/dui';
import { getParticipantByDocumentNumber } from '../../../lib/server/participants';

export const POST: APIRoute = async ({ request }) => {
  await ensureDatabase();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rawBody = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  const token = String(rawBody.token ?? '');
  const course = await getCourseByPublicEnrollmentToken(token);

  if (!course) {
    return new Response(JSON.stringify({ error: 'El enlace público no es válido' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate the DUI in the body via the canonical schema so the
  // participant lookup and persistence always use a normalized form.
  // PR1 returns 404 when the participant is not found; the full
  // 200-with-redirect flow to /registro is PR3.
  const duiParse = duiSchema.safeParse(rawBody.dui);
  if (!duiParse.success) {
    return new Response(JSON.stringify({ error: 'Datos inválidos', details: duiParse.error.flatten() }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const participant = await getParticipantByDocumentNumber(duiParse.data);
  if (!participant) {
    return new Response(JSON.stringify({ error: 'No encontramos un participante con ese DUI. Regístrate primero.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parsed = enrollmentSubmissionSchema.safeParse({
    courseId: course.id,
    participantId: participant.id,
    fullName: rawBody.fullName,
    email: rawBody.email,
    phone: rawBody.phone,
    dui: duiParse.data,
    notas: rawBody.notas,
  });

  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Datos inválidos', details: parsed.error.flatten() }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const enrollment = await createEnrollment({
      courseId: course.id,
      publicToken: token,
      participantId: participant.id,
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
    const status = message.includes('cupo máximo') ? 409 : message.includes('no está disponible') ? 409 : 400;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
