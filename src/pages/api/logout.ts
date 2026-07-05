import type { APIRoute } from 'astro';

import { logoutUser } from '../../lib/server/auth';

export const POST: APIRoute = async ({ cookies }) => {
  await logoutUser(cookies);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
