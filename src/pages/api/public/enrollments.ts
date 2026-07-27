import type { APIRoute } from 'astro';

import { ensureDatabase } from '../../../lib/server/bootstrap';
import { getCourseByPublicEnrollmentToken } from '../../../lib/server/courses';
import { createEnrollment } from '../../../lib/server/enrollments';
import { duiSchema } from '../../../lib/server/dui';
import { getParticipantByDocumentNumber } from '../../../lib/server/participants';

/**
 * Public enrollment endpoint.
 *
 * Accepts only `{ token, dui }`. The token resolves the course (404 if
 * missing/mismatched); the DUI is normalized via `duiSchema` (400 if
 * malformed) and looked up:
 *
 *   • hit  → 201 with `{ data: enrollment }` (participant-backed create).
 *   • miss → 200 with `{ redirect: '/registro?redirect=%2Fcursos%2F<id>%3Ftoken%3D<token>' }`.
 *
 * The SPA persists the round-trip in sessionStorage and, after the user
 * registers, auto-resumes the enrollment on the course page. See
 * `openspec/changes/acoes-dui-enrollment-flow/specs/public-enrollment-by-dui/spec.md`.
 */
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
  const duiParse = duiSchema.safeParse(rawBody.dui);
  if (!duiParse.success) {
    return new Response(JSON.stringify({ error: 'Datos inválidos', details: duiParse.error.flatten() }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const participant = await getParticipantByDocumentNumber(duiParse.data);
  if (!participant) {
    // Round-trip signal: the SPA stores the intent in sessionStorage,
    // navigates to the registration page, and resumes the enrollment
    // automatically when the user returns to the course.
    const coursePath = `/cursos/${course.id}?token=${encodeURIComponent(token)}`;
    const redirect = `/registro?redirect=${encodeURIComponent(coursePath)}`;
    return new Response(JSON.stringify({ redirect }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const enrollment = await createEnrollment({
      courseId: course.id,
      publicToken: token,
      participantId: participant.id,
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
