import type { APIRoute } from 'astro';

import { ensureDatabase } from '../../../../lib/server/bootstrap';
import { getCourseByPublicEnrollmentToken } from '../../../../lib/server/courses';

export const GET: APIRoute = async ({ url }) => {
  await ensureDatabase();

  const token = url.searchParams.get('token') ?? '';
  const course = await getCourseByPublicEnrollmentToken(token);

  if (!course) {
    return new Response(JSON.stringify({ error: 'Token inválido' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    data: {
      token: course.public_enrollment_token,
      course: {
        id: course.id,
        name: course.name,
        instructor: course.instructor,
        estado: course.estado,
        cupo_maximo: course.cupo_maximo,
        inscritos: course.inscritos,
      },
    },
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
