import type { APIRoute } from 'astro';
import { z } from 'zod';

import { createSession, loginUser } from '../../lib/server/auth';
import { normalizeRole } from '../../lib/server/permissions';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Credenciales inválidas' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const user = await loginUser(parsed.data.email, parsed.data.password);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Usuario o contraseña incorrectos' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await createSession(user.id, cookies);

  let redirectTo = '/dashboard';
  const role = normalizeRole(user.role);

  if (role === 'participante') {
    redirectTo = '/registro';
  } else if (role === 'facilitador') {
    redirectTo = '/dashboard/participantes/nuevo';
  }

  return new Response(JSON.stringify({ user, redirectTo }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
