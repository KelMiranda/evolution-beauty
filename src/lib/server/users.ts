import bcrypt from 'bcryptjs';
import { query, withTransaction } from './db';
import { recordAuditEvent } from './audit';
import type { UserInput, UserPatch } from './user-schema';

export type UserRow = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  active: boolean;
  created_at: string;
};

export async function listUsers(): Promise<UserRow[]> {
  const result = await query<UserRow>(
    `SELECT id, email, full_name, role, active, created_at
     FROM users
     ORDER BY created_at DESC`,
  );
  return result.rows;
}

export async function getUserById(id: number): Promise<UserRow | null> {
  const result = await query<UserRow>(
    `SELECT id, email, full_name, role, active, created_at
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function createUser(input: UserInput, actorUserId: number): Promise<UserRow> {
  return withTransaction(async (tx) => {
    const passwordHash = await bcrypt.hash(input.password, 10);

    const result = await tx.query<UserRow>(
      `INSERT INTO users (email, password_hash, full_name, role, active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, role, active, created_at`,
      [input.email, passwordHash, input.fullName, input.role, input.active],
    );

    const user = result.rows[0];

    await recordAuditEvent(tx, {
      entityType: 'user',
      entityId: user.id,
      action: 'create',
      actorUserId,
      afterData: user,
    });

    return user;
  });
}

export async function updateUser(id: number, patch: UserPatch, actorUserId: number): Promise<UserRow> {
  return withTransaction(async (tx) => {
    const current = await tx.query<UserRow>(
      `SELECT id, email, full_name, role, active, created_at
       FROM users WHERE id = $1 LIMIT 1`,
      [id],
    );
    const before = current.rows[0];
    if (!before) throw new Error('User not found');

    const passwordHash = patch.password ? await bcrypt.hash(patch.password, 10) : null;

    const result = await tx.query<UserRow>(
      `UPDATE users SET
        email = $2,
        full_name = $3,
        role = $4,
        active = $5${passwordHash ? ', password_hash = $6' : ''}
       WHERE id = $1
       RETURNING id, email, full_name, role, active, created_at`,
      passwordHash
        ? [id, patch.email ?? before.email, patch.fullName ?? before.full_name, patch.role ?? before.role, patch.active ?? before.active, passwordHash]
        : [id, patch.email ?? before.email, patch.fullName ?? before.full_name, patch.role ?? before.role, patch.active ?? before.active],
    );

    const updated = result.rows[0];

    await recordAuditEvent(tx, {
      entityType: 'user',
      entityId: id,
      action: 'update',
      actorUserId,
      beforeData: before,
      afterData: updated,
    });

    return updated;
  });
}

export async function deactivateUser(id: number, actorUserId: number): Promise<void> {
  if (id === actorUserId) {
    throw new Error('Cannot deactivate your own account');
  }

  return withTransaction(async (tx) => {
    const current = await tx.query<UserRow>(
      `SELECT id, email, full_name, role, active, created_at
       FROM users WHERE id = $1 LIMIT 1`,
      [id],
    );
    const before = current.rows[0];
    if (!before) throw new Error('User not found');

    await tx.query(
      `UPDATE users SET active = FALSE WHERE id = $1`,
      [id],
    );

    await recordAuditEvent(tx, {
      entityType: 'user',
      entityId: id,
      action: 'deactivate',
      actorUserId,
      beforeData: before,
      afterData: { ...before, active: false },
    });
  });
}
