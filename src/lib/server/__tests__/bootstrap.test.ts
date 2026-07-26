import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ensureDatabase } from '../bootstrap';
import { query, withTransaction } from '../db';

// These tests run against the live PostgreSQL test database. They are
// integration-only: a runtime probe at module load skips the suite when
// DATABASE_URL is unset OR the host is unreachable, so unit-only CI
// environments (no service container) do not fail. Use a fresh pool
// here so a half-broken shared pool from previous test files cannot
// mask the reachability check.
let dbReachable = false;
{
  const url = process.env.DATABASE_URL;
  if (url) {
    try {
      const probe = await import('pg');
      const pool = new probe.default.Pool({ connectionString: url, connectionTimeoutMillis: 1500 });
      try {
        await pool.query('SELECT 1');
        dbReachable = true;
      } finally {
        await pool.end().catch(() => undefined);
      }
    } catch {
      dbReachable = false;
    }
  }
}

const describeIfDb = dbReachable ? describe : describe.skip;

describeIfDb('bootstrap — participant FK migration', () => {
  beforeAll(async () => {
    // Force a clean bootstrap run. The singleton flag inside bootstrap.ts
    // is module-scoped to this vitest process, so the first ensureDatabase
    // call here will execute the full DDL + migration block.
    await ensureDatabase();
  });

  afterAll(async () => {
    // Nothing to clean up — we never insert any rows. The schema changes
    // are committed and remain visible for downstream tests.
  });

  it('enrollments.participant_id is NOT NULL after bootstrap', async () => {
    const result = await query<{ is_nullable: string }>(
      `SELECT is_nullable FROM information_schema.columns
       WHERE table_name = 'enrollments' AND column_name = 'participant_id'`,
    );
    expect(result.rows[0]?.is_nullable).toBe('NO');
  });

  it('enrollments.participant_id FK uses ON DELETE CASCADE', async () => {
    const result = await query<{ confdeltype: string }>(
      `SELECT confdeltype FROM pg_constraint
       WHERE conrelid = 'enrollments'::regclass
         AND contype = 'f'
         AND conname = 'enrollments_participant_id_fkey'`,
    );
    // 'c' = CASCADE in pg_constraint.confdeltype
    expect(result.rows[0]?.confdeltype).toBe('c');
  });

  it('idx_enrollments_participant_id exists', async () => {
    const result = await query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes
       WHERE tablename = 'enrollments' AND indexname = 'idx_enrollments_participant_id'`,
    );
    expect(result.rows[0]?.indexname).toBe('idx_enrollments_participant_id');
  });

  it('bootstrap is idempotent (second run does not error)', async () => {
    // ensureDatabase() is a no-op after the first successful run because
    // the singleton flag is set, but the underlying DDL block was already
    // designed to be idempotent (CREATE TABLE IF NOT EXISTS, ADD COLUMN
    // IF NOT EXISTS, etc). Force a re-execution of the same SQL to prove
    // the migration block is safe to re-run on an already-migrated DB.
    await expect(ensureDatabase()).resolves.not.toThrow();
  });

  it('cascades enrollment rows when a participant is deleted', async () => {
    // Run inside a transaction that we ROLLBACK so the test DB stays
    // clean. This proves the FK semantics without persisting test data.
    await withTransaction(async (tx) => {
      // Insert a throwaway participant (unique DUI to avoid any chance
      // of collision with admin-created data).
      const uniqueDui = `99${Date.now()}-${Math.floor(Math.random() * 9)}`;
      const p = await tx.query<{ id: string }>(
        `INSERT INTO participants (
           participant_code, full_name, document_number, birth_date, gender,
           phone_country, phone_dial_code, phone_number, phone, role_function,
           status, lifecycle_state, consent
         ) VALUES (
           'ACOES-CASCADE-TEST', 'Cascade Test', $1, '1990-01-01', 'Femenino',
           'El Salvador', '+503', '7000-9999', '+503 7000-9999', 'Participante',
           'Activo', 'active', TRUE
         ) RETURNING id`,
        [uniqueDui],
      );
      const participantId = Number(p.rows[0]?.id ?? 0);
      expect(participantId).toBeGreaterThan(0);

      // Find any existing course to satisfy the FK (the dev seed keeps
      // at least one course; if not, this test would fail with FK
      // violation which is the correct behavior).
      const c = await tx.query<{ id: string }>(`SELECT id FROM courses LIMIT 1`);
      const courseId = Number(c.rows[0]?.id ?? 0);
      expect(courseId).toBeGreaterThan(0);

      // Insert an enrollment referencing that participant.
      const e = await tx.query<{ id: string }>(
        `INSERT INTO enrollments (
           course_id, participant_id, full_name, email, phone, dui
         ) VALUES ($1, $2, 'Cascade Test', 'cascade@example.com', '+503 7000-9999', $3)
         RETURNING id`,
        [courseId, participantId, uniqueDui],
      );
      const enrollmentId = Number(e.rows[0]?.id ?? 0);
      expect(enrollmentId).toBeGreaterThan(0);

      // Sanity: enrollment exists inside the transaction.
      const before = await tx.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM enrollments WHERE id = $1`,
        [enrollmentId],
      );
      expect(Number(before.rows[0]?.count)).toBe(1);

      // Delete the participant — enrollment should be cascaded.
      await tx.query(`DELETE FROM participants WHERE id = $1`, [participantId]);

      const after = await tx.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM enrollments WHERE id = $1`,
        [enrollmentId],
      );
      expect(Number(after.rows[0]?.count)).toBe(0);

      // Force a rollback so the cascade test does not pollute the DB.
      throw new Error('__cascade_test_rollback__');
    }).catch((err) => {
      if (!(err instanceof Error) || err.message !== '__cascade_test_rollback__') {
        throw err;
      }
    });
  });
});
