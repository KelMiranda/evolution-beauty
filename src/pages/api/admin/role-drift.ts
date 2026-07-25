import type { APIRoute } from 'astro';

import { getCurrentUser, requireRole } from '../../../lib/server/auth';
import { countLegacyFacilitadoraRows } from '../../../lib/server/permissions';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const user = await getCurrentUser(cookies);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!requireRole(user, ['admin'])) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const legacyFacilitadoraCount = await countLegacyFacilitadoraRows();
  return Response.json({ legacy_facilitadora_count: legacyFacilitadoraCount });
};
