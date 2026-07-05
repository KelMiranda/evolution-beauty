import type { APIRoute } from 'astro';

import { getCurrentUser } from '../../../lib/server/auth';
import { ensureDatabase } from '../../../lib/server/bootstrap';
import { canViewDashboard } from '../../../lib/server/permissions';
import { getParticipantIndicators } from '../../../lib/server/participants';

export const GET: APIRoute = async ({ url, cookies }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  if (!user) return new Response('Unauthorized', { status: 401 });

  if (!canViewDashboard(user)) {
    return new Response('Forbidden', { status: 403 });
  }

  const dateFrom = url.searchParams.get('dateFrom') ?? undefined;
  const dateTo = url.searchParams.get('dateTo') ?? undefined;

  const indicators = await getParticipantIndicators(dateFrom, dateTo);
  return Response.json({ indicators });
};
