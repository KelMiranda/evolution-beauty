import type { APIRoute } from 'astro';

import { getCurrentUser } from '../../lib/server/auth';
import { ensureDatabase } from '../../lib/server/bootstrap';
import { query } from '../../lib/server/db';

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  await ensureDatabase();
  const user = await getCurrentUser(cookies);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return Response.json({ error: 'Invalid JSON body' }, { status: 400 });

  const subscription = body as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return Response.json({ error: 'Invalid subscription payload' }, { status: 400 });
  }

  const result = await query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, user_agent = EXCLUDED.user_agent, updated_at = NOW()
     RETURNING id`,
    [user.id, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, request.headers.get('user-agent') ?? clientAddress ?? null],
  );

  return Response.json({ data: result.rows[0] });
};
