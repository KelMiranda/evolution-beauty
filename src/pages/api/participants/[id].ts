import type { APIRoute } from 'astro';
import { z } from 'zod';

import { getCurrentUser } from '../../../lib/server/auth';
import { ensureDatabase } from '../../../lib/server/bootstrap';
import { canManageParticipants } from '../../../lib/server/permissions';
import { getParticipantById, setParticipantLifecycle, updateParticipant } from '../../../lib/server/participants';
import { validateParticipantSubmission } from '../../../lib/server/participant-schema';

const lifecycleSchema = z.object({
  lifecycleState: z.enum(['active', 'inactive']),
});

export const PATCH: APIRoute = async ({ request, cookies, params }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  if (!user) return new Response('Unauthorized', { status: 401 });

  if (!canManageParticipants(user)) {
    return new Response('Forbidden', { status: 403 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return new Response('Invalid participant id', { status: 400 });
  }

  const parsed = lifecycleSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return new Response('Datos inválidos', { status: 400 });
  }

  const participant = await getParticipantById(id);
  if (!participant) {
    return new Response('Not found', { status: 404 });
  }

  const updated = await setParticipantLifecycle(id, parsed.data.lifecycleState, user.id);
  return Response.json({ participant: updated });
};

export const DELETE: APIRoute = async ({ cookies, params }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  if (!user) return new Response('Unauthorized', { status: 401 });

  if (!canManageParticipants(user)) {
    return new Response('Forbidden', { status: 403 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return new Response('Invalid participant id', { status: 400 });
  }

  const participant = await getParticipantById(id);
  if (!participant) {
    return new Response('Not found', { status: 404 });
  }

  const updated = await setParticipantLifecycle(id, 'inactive', user.id);
  return Response.json({ participant: updated });
};

export const PUT: APIRoute = async ({ request, cookies, params, redirect }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  if (!user) return new Response('Unauthorized', { status: 401 });

  if (!canManageParticipants(user)) {
    return new Response('Forbidden', { status: 403 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return new Response('Invalid participant id', { status: 400 });
  }

  const formData = await request.formData();
  const parsed = validateParticipantSubmission(formData, 'Activo');

  if (!parsed.success) {
    return new Response('Datos inválidos', { status: 400 });
  }

  await updateParticipant(id, {
    fullName: parsed.data.fullName,
    documentNumber: parsed.data.documentNumber,
    birthDate: parsed.data.birthDate,
    gender: parsed.data.gender,
    phoneCountry: parsed.data.phoneCountry,
    phoneDialCode: parsed.data.phoneDialCode,
    phoneNumber: parsed.data.phoneNumber,
    phone: parsed.data.phone,
    email: parsed.data.email,
    address: parsed.data.address,
    municipality: parsed.data.municipality,
    department: parsed.data.department,
    district: parsed.data.district,
    organization: parsed.data.organization,
    roleFunction: parsed.data.roleFunction,
    educationLevel: parsed.data.educationLevel,
    program: parsed.data.program,
    status: parsed.data.status,
    notes: parsed.data.notes,
    consent: parsed.data.consent,
  }, user.id);

  return redirect('/dashboard/participantes?updated=1');
};
