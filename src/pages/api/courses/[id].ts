import type { APIRoute } from 'astro';

import { getCurrentUser } from '../../../lib/server/auth';
import { ensureDatabase } from '../../../lib/server/bootstrap';
import { canManageCourses } from '../../../lib/server/permissions';
import { deleteCourse, getCourseById, updateCourse, type CourseInput } from '../../../lib/server/courses';
import { coursePatchSchema } from '../../../lib/server/course-schema';

export const GET: APIRoute = async ({ params, cookies }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  const isManager = user && canManageCourses(user);

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return new Response(JSON.stringify({ error: 'Invalid course id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const course = await getCourseById(id, { includeHidden: !!isManager });
  if (!course) {
    return new Response(JSON.stringify({ error: 'Course not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ data: course }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  if (!canManageCourses(user)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return new Response(JSON.stringify({ error: 'Invalid course id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const existing = await getCourseById(id, { includeHidden: true });
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Course not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
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

  const parsed = coursePatchSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Datos inválidos', details: parsed.error.flatten() }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const patch: Record<string, unknown> = {};

    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.description !== undefined) patch.description = parsed.data.description;
    if (parsed.data.category !== undefined) patch.category = parsed.data.category;
    if (parsed.data.level !== undefined) patch.level = parsed.data.level;
    if (parsed.data.instructor !== undefined) patch.instructor = parsed.data.instructor;
    if (parsed.data.instructorBio !== undefined) patch.instructorBio = parsed.data.instructorBio;
    if (parsed.data.price !== undefined) patch.price = parsed.data.price;
    if (parsed.data.priceOriginal !== undefined) patch.priceOriginal = parsed.data.priceOriginal;
    if (parsed.data.image !== undefined) patch.image = parsed.data.image;
    if (parsed.data.fechaInicio !== undefined) patch.fechaInicio = parsed.data.fechaInicio;
    if (parsed.data.fechaFin !== undefined) patch.fechaFin = parsed.data.fechaFin;
    if (parsed.data.horario !== undefined) patch.horario = parsed.data.horario;
    if (parsed.data.departamento !== undefined) patch.departamento = parsed.data.departamento;
    if (parsed.data.municipio !== undefined) patch.municipio = parsed.data.municipio;
    if (parsed.data.departamento !== undefined && parsed.data.municipio !== undefined) {
      patch.ubicacion = `${parsed.data.municipio}, ${parsed.data.departamento}`;
    }
    if (parsed.data.lat !== undefined) patch.lat = parsed.data.lat;
    if (parsed.data.lng !== undefined) patch.lng = parsed.data.lng;
    if (parsed.data.cupoMaximo !== undefined) patch.cupoMaximo = parsed.data.cupoMaximo;
    if (parsed.data.estado !== undefined) patch.estado = parsed.data.estado;
    if (parsed.data.tags !== undefined) patch.tags = parsed.data.tags;

    const course = await updateCourse(id, patch as Partial<CourseInput>, user.id);

    return new Response(JSON.stringify({ data: course }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error updating course' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  if (!canManageCourses(user)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return new Response(JSON.stringify({ error: 'Invalid course id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const existing = await getCourseById(id, { includeHidden: true });
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Course not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    await deleteCourse(id, user.id);
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error deleting course' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
