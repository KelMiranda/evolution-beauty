import type { APIRoute } from 'astro';
import { getCurrentUser } from '../../lib/server/auth';

export const GET: APIRoute = async ({ cookies }) => {
  const user = await getCurrentUser(cookies);

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return Response.json({ user }, {
    headers: { 'Content-Type': 'application/json' },
  });
};
