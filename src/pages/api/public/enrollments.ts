import type { APIRoute } from 'astro';

import { ensureDatabase } from '../../../lib/server/bootstrap';
import { getCourseByPublicEnrollmentToken } from '../../../lib/server/courses';
import { createEnrollment } from '../../../lib/server/enrollments';
import { enrollmentSubmissionSchema } from '../../../lib/server/course-schema';

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

  const token = typeof body === 'object' && body !== null ? String((body as { token?: unknown }).token ?? '') : '';
  const course = await getCourseByPublicEnrollmentToken(token);

  if (!course) {
    return new Response(JSON.stringify({ error: 'El enlace público no es válido' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parsed = enrollmentSubmissionSchema.safeParse({
    courseId: course.id,
    fullName: typeof body === 'object' && body !== null ? (body as Record<string, unknown>).fullName : undefined,
    email: typeof body === 'object' && body !== null ? (body as Record<string, unknown>).email : undefined,
    phone: typeof body === 'object' && body !== null ? (body as Record<string, unknown>).phone : undefined,
    dui: typeof body === 'object' && body !== null ? (body as Record<string, unknown>).dui : undefined,
    notas: typeof body === 'object' && body !== null ? (body as Record<string, unknown>).notas : undefined,
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
