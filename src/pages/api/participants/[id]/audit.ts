import type { APIRoute } from 'astro';

import { getCurrentUser } from '../../../../lib/server/auth';
import { ensureDatabase } from '../../../../lib/server/bootstrap';
import { canViewAuditTrail } from '../../../../lib/server/permissions';
import { getParticipantAuditTrail, getParticipantById } from '../../../../lib/server/participants';

export const GET: APIRoute = async ({ cookies, params }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  if (!user) return new Response('Unauthorized', { status: 401 });

  if (!canViewAuditTrail(user)) {
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

  const events = await getParticipantAuditTrail(id);
  return Response.json({ participant, events });
};
