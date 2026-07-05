import type { APIRoute } from 'astro';
import { getCurrentUser } from '../../../lib/server/auth';
import { ensureDatabase } from '../../../lib/server/bootstrap';
import { canManageUsers } from '../../../lib/server/permissions';
import { getUserById, updateUser, deactivateUser } from '../../../lib/server/users';
import { validateUserSubmission } from '../../../lib/server/user-schema';

export const PUT: APIRoute = async ({ request, cookies, params, redirect }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  if (!user) return new Response('Unauthorized', { status: 401 });

  if (!canManageUsers(user)) {
    return new Response('Forbidden', { status: 403 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return new Response('Invalid user id', { status: 400 });
  }

  const existing = await getUserById(id);
  if (!existing) {
    return new Response('Not found', { status: 404 });
  }

  const formData = await request.formData();
  const parsed = validateUserSubmission(formData);

  if (!parsed.success) {
    return new Response('Datos inválidos', { status: 400 });
  }

  const patch = {
    email: parsed.data.email,
    fullName: parsed.data.fullName,
    role: parsed.data.role,
    active: parsed.data.active,
  };

  try {
    await updateUser(id, patch, user.id);
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate')) {
      return new Response('Este correo ya está registrado', { status: 400 });
    }
    throw error;
  }

  return redirect('/dashboard/usuarios?updated=1');
};

export const PATCH: APIRoute = async ({ cookies, params, redirect }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  if (!user) return new Response('Unauthorized', { status: 401 });

  if (!canManageUsers(user)) {
    return new Response('Forbidden', { status: 403 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return new Response('Invalid user id', { status: 400 });
  }

  const existing = await getUserById(id);
  if (!existing) {
    return new Response('Not found', { status: 404 });
  }

  try {
    await deactivateUser(id, user.id);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot deactivate your own')) {
      return new Response('No puedes desactivar tu propia cuenta', { status: 400 });
    }
    throw error;
  }

  return redirect('/dashboard/usuarios?deactivated=1');
};
