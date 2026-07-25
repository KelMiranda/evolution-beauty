import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

import { ensureDatabase } from './bootstrap';
import { query } from './db';
import { normalizeRole, type CanonicalRole } from './permissions';

const COOKIE_NAME = 'acoes_session';
const SESSION_DAYS = 7;

type CookieStore = {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options?: Record<string, unknown>): void;
  delete(name: string, options?: Record<string, unknown>): void;
};

export type AuthUser = {
  id: number;
  email: string;
  full_name: string;
  role: CanonicalRole;
  active: boolean;
};

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function cookieOptions() {
  const secure = false;

  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

export async function loginUser(email: string, password: string) {
  await ensureDatabase();

  const result = await query<AuthUser & { password_hash: string }>(
    `SELECT id, email, full_name, role, active, password_hash
     FROM users
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [email],
  );

  const user = result.rows[0];

  if (!user || !user.active) return null;

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;

  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: normalizeRole(user.role),
    active: user.active,
  } satisfies AuthUser;
}

export async function createSession(userId: number, cookies: CookieStore) {
  await ensureDatabase();

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt.toISOString()],
  );

  cookies.set(COOKIE_NAME, token, cookieOptions());
}

export async function getCurrentUser(cookies: CookieStore): Promise<AuthUser | null> {
  await ensureDatabase();

  const session = cookies.get(COOKIE_NAME);
  if (!session?.value) return null;

  const tokenHash = hashToken(session.value);
  const result = await query<AuthUser>(
    `SELECT u.id, u.email, u.full_name, u.role, u.active
     FROM sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.revoked_at IS NULL
       AND s.expires_at > NOW()
       AND u.active = TRUE
     LIMIT 1`,
    [tokenHash],
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    ...row,
    role: normalizeRole(row.role),
  } satisfies AuthUser;
}

export async function logoutUser(cookies: CookieStore) {
  await ensureDatabase();

  const session = cookies.get(COOKIE_NAME);
  if (session?.value) {
    await query(
      `UPDATE sessions SET revoked_at = NOW() WHERE token_hash = $1`,
      [hashToken(session.value)],
    );
  }

  cookies.delete(COOKIE_NAME, { path: '/' });
}

export function requireRole(user: AuthUser | null, allowed: CanonicalRole[]) {
  return Boolean(user && allowed.includes(user.role));
}
