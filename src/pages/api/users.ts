import type { APIRoute } from 'astro';
import { z } from 'zod';

import { getCurrentUser } from '../../lib/server/auth';
import { ensureDatabase } from '../../lib/server/bootstrap';
import { canManageUsers } from '../../lib/server/permissions';
import { createUser, deactivateUser, listUsers, updateUser } from '../../lib/server/users';
import { userSubmissionSchema } from '../../lib/server/user-schema';

const patchSchema = z.object({
  id: z.number(),
  email: z.string().email().optional(),
  fullName: z.string().min(1).optional(),
  role: z.enum(['admin', 'facilitadora', 'participante']).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export const GET: APIRoute = async ({ cookies }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!canManageUsers(user)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const users = await listUsers();
  return new Response(JSON.stringify({ data: users }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!canManageUsers(user)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parsed = userSubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Datos inválidos', details: parsed.error.flatten() }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const newUser = await createUser(parsed.data, user.id);
    return new Response(JSON.stringify({ data: newUser }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate')) {
      return new Response(JSON.stringify({ error: 'Este correo ya está registrado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    throw error;
  }
};

export const PATCH: APIRoute = async ({ request, cookies }) => {
  await ensureDatabase();

  const currentUser = await getCurrentUser(cookies);
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!canManageUsers(currentUser)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid patch data', details: parsed.error.flatten() }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!parsed.data.id) {
    return new Response(JSON.stringify({ error: 'User ID required in body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const updated = await updateUser(parsed.data.id, {
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      role: parsed.data.role,
      active: parsed.data.active,
      password: parsed.data.password,
    }, currentUser.id);

    return new Response(JSON.stringify({ data: updated }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate')) {
      return new Response(JSON.stringify({ error: 'Este correo ya está registrado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    throw error;
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  await ensureDatabase();

  const currentUser = await getCurrentUser(cookies);
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!canManageUsers(currentUser)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const idSchema = z.object({ id: z.number() });
  const parsed = idSchema.safeParse(body);
  if (!parsed.success || !parsed.data.id) {
    return new Response(JSON.stringify({ error: 'User ID required in body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await deactivateUser(parsed.data.id, currentUser.id);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('own account')) {
      return new Response(JSON.stringify({ error: 'No puedes desactivar tu propia cuenta' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    throw error;
  }
};
