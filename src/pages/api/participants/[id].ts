import type { APIRoute } from 'astro';
import { z } from 'zod';

import { getCurrentUser } from '../../../lib/server/auth';
import { ensureDatabase } from '../../../lib/server/bootstrap';
import { canManageParticipants } from '../../../lib/server/permissions';
import { getParticipantById, setParticipantLifecycle, updateParticipant } from '../../../lib/server/participants';
import { participantSubmissionSchema } from '../../../lib/server/participant-schema';

const lifecycleSchema = z.object({
  lifecycleState: z.enum(['active', 'inactive']),
});

export const PATCH: APIRoute = async ({ request, cookies, params }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  if (!canManageParticipants(user)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return new Response(JSON.stringify({ error: 'Invalid participant id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const parsed = lifecycleSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const participant = await getParticipantById(id);
  if (!participant) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const updated = await setParticipantLifecycle(id, parsed.data.lifecycleState, user.id);
  return Response.json({ participant: updated });
};

export const DELETE: APIRoute = async ({ cookies, params }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  if (!canManageParticipants(user)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return new Response(JSON.stringify({ error: 'Invalid participant id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const participant = await getParticipantById(id);
  if (!participant) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const updated = await setParticipantLifecycle(id, 'inactive', user.id);
  return Response.json({ participant: updated });
};

export const PUT: APIRoute = async ({ request, cookies, params }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  if (!canManageParticipants(user)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return new Response(JSON.stringify({ error: 'Invalid participant id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const parsed = participantSubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Datos inválidos', details: parsed.error.flatten() }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
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

    return Response.json({ success: true });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error updating participant' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
