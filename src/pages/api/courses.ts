import type { APIRoute } from 'astro';

import { getCurrentUser } from '../../lib/server/auth';
import { ensureDatabase } from '../../lib/server/bootstrap';
import { canManageCourses } from '../../lib/server/permissions';
import { createCourse, listCourses } from '../../lib/server/courses';
import { courseSubmissionSchema } from '../../lib/server/course-schema';

export const GET: APIRoute = async ({ url, cookies }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  const isManager = user && canManageCourses(user);

  const search = url.searchParams.get('search') ?? '';
  const category = url.searchParams.get('category') ?? '';
  const nivel = url.searchParams.get('nivel') ?? '';
  const estado = url.searchParams.get('estado') ?? '';

  const courses = await listCourses({
    search: search || undefined,
    category: category || undefined,
    nivel: nivel || undefined,
    estado: estado || undefined,
  }, { includeHidden: !!isManager });

  return new Response(JSON.stringify({ data: courses }), {
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

  if (!canManageCourses(user)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
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

  const parsed = courseSubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Datos inválidos', details: parsed.error.flatten() }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const ubicacion = `${parsed.data.municipio}, ${parsed.data.departamento}`;
    const course = await createCourse(
      {
        name: parsed.data.name,
        description: parsed.data.description,
        category: parsed.data.category,
        level: parsed.data.level,
        instructor: parsed.data.instructor,
        instructorBio: parsed.data.instructorBio,
        price: parsed.data.price,
        priceOriginal: parsed.data.priceOriginal,
        image: parsed.data.image,
        fechaInicio: parsed.data.fechaInicio,
        fechaFin: parsed.data.fechaFin,
        horario: parsed.data.horario,
        ubicacion,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        departamento: parsed.data.departamento,
        municipio: parsed.data.municipio,
        cupoMaximo: parsed.data.cupoMaximo,
        estado: parsed.data.estado,
        tags: parsed.data.tags,
      },
      user.id,
    );

    return new Response(JSON.stringify({ data: course }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error creating course' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
