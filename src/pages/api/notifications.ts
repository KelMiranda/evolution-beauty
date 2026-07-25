import type { APIRoute } from 'astro';

import { getCurrentUser } from '../../lib/server/auth';
import { ensureDatabase } from '../../lib/server/bootstrap';
import { listNotifications } from '../../lib/server/notifications';

export const GET: APIRoute = async ({ cookies }) => {
  await ensureDatabase();
  const user = await getCurrentUser(cookies);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  return Response.json({ data: await listNotifications(user.id) });
};
