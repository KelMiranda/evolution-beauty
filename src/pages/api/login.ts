import type { APIRoute } from 'astro';
import { z } from 'zod';

import { createSession, loginUser } from '../../lib/server/auth';
import { normalizeRole } from '../../lib/server/permissions';
import { verifyTurnstileToken } from '../../lib/server/turnstile';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  turnstileToken: z.string().optional(),
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

  // The Turnstile helper gracefully no-ops when `TURNSTILE_SECRET` is empty
  // (dev mode), so this check stays inert until the secret is configured.
  // The token is forwarded as-is so the server-side helper can match it
  // against Cloudflare's siteverify response.
  const remoteIp =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const turnstile = await verifyTurnstileToken(parsed.data.turnstileToken, remoteIp ?? undefined);
  if (!turnstile.ok) {
    return new Response(
      JSON.stringify({ error: 'turnstile_failed', message: turnstile.reason }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
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
