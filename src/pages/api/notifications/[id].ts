import type { APIRoute } from 'astro';

import { getCurrentUser } from '../../../lib/server/auth';
import { ensureDatabase } from '../../../lib/server/bootstrap';
import { markNotificationRead } from '../../../lib/server/notifications';

export const PATCH: APIRoute = async ({ params, cookies }) => {
  await ensureDatabase();
  const user = await getCurrentUser(cookies);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const id = Number(params.id);
  if (!Number.isFinite(id)) return Response.json({ error: 'Invalid notification id' }, { status: 400 });

  const notification = await markNotificationRead(id, user.id);
  if (!notification) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json({ data: notification });
};
