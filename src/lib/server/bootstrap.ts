import bcrypt from 'bcryptjs';

import { query } from './db';
import { canonicalRoles } from './permissions';

let bootstrapped = false;
let bootstrapPromise: Promise<void> | null = null;

function requiredBootstrapEmail() {
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim();

  if (!email) {
    throw new Error('INITIAL_ADMIN_EMAIL is required when bootstrapping a new database');
  }

  return email;
}

function requiredBootstrapPassword() {
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!password) {
    throw new Error('INITIAL_ADMIN_PASSWORD is required when bootstrapping a new database');
  }

  return password;
}

async function createTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS participants (
      id BIGSERIAL PRIMARY KEY,
      participant_code TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      document_number TEXT NOT NULL UNIQUE,
      birth_date DATE NOT NULL,
      gender TEXT NOT NULL,
      phone_country TEXT NOT NULL DEFAULT 'El Salvador',
      phone_dial_code TEXT NOT NULL DEFAULT '+503',
      phone_number TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      municipality TEXT,
      department TEXT,
      district TEXT,
      organization TEXT,
      role_function TEXT NOT NULL DEFAULT 'Participante',
      education_level TEXT,
      program TEXT,
      status TEXT NOT NULL DEFAULT 'Activo',
      lifecycle_state TEXT NOT NULL DEFAULT 'active',
      deleted_at TIMESTAMPTZ,
      deleted_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      notes TEXT,
      consent BOOLEAN NOT NULL DEFAULT FALSE,
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id BIGSERIAL PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id BIGINT NOT NULL,
      action TEXT NOT NULL,
      actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      before_data JSONB,
      after_data JSONB,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS courses (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      level TEXT NOT NULL,
      instructor TEXT NOT NULL,
      instructor_bio TEXT,
      price NUMERIC(10,2) NOT NULL DEFAULT 0,
      price_original NUMERIC(10,2),
      image TEXT,
      fecha_inicio DATE NOT NULL,
      fecha_fin DATE NOT NULL,
      horario TEXT,
      ubicacion TEXT,
      departamento TEXT,
      municipio TEXT,
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      cupo_maximo INTEGER NOT NULL DEFAULT 0,
      inscritos INTEGER NOT NULL DEFAULT 0,
      estado TEXT NOT NULL DEFAULT 'draft',
      tags JSONB,
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id BIGSERIAL PRIMARY KEY,
      course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      participant_id BIGINT REFERENCES participants(id) ON DELETE SET NULL,
      enrolled_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      dui TEXT,
      fecha_inscripcion DATE NOT NULL DEFAULT CURRENT_DATE,
      estado TEXT NOT NULL DEFAULT 'confirmed',
      notas TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'facilitadora', 'participante'));

    ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_lifecycle_state_check;
    ALTER TABLE participants ADD CONSTRAINT participants_lifecycle_state_check CHECK (lifecycle_state IN ('active', 'inactive'));

    ALTER TABLE participants ADD COLUMN IF NOT EXISTS district TEXT;
    ALTER TABLE participants ADD COLUMN IF NOT EXISTS role_function TEXT NOT NULL DEFAULT 'Participante';
    ALTER TABLE participants ADD COLUMN IF NOT EXISTS education_level TEXT;
    ALTER TABLE participants ADD COLUMN IF NOT EXISTS lifecycle_state TEXT NOT NULL DEFAULT 'active';
    ALTER TABLE participants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE participants ADD COLUMN IF NOT EXISTS deleted_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

    ALTER TABLE participants ADD COLUMN IF NOT EXISTS phone_country TEXT NOT NULL DEFAULT 'El Salvador';
    ALTER TABLE participants ADD COLUMN IF NOT EXISTS phone_dial_code TEXT NOT NULL DEFAULT '+503';
    ALTER TABLE participants ADD COLUMN IF NOT EXISTS phone_number TEXT NOT NULL DEFAULT '';

    ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_estado_check;
    ALTER TABLE courses ADD CONSTRAINT courses_estado_check CHECK (estado IN ('draft', 'published', 'enrolling', 'in_progress', 'completed', 'cancelled'));

    ALTER TABLE courses ADD COLUMN IF NOT EXISTS departamento TEXT;
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS municipio TEXT;

    ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_estado_check;
    ALTER TABLE enrollments ADD CONSTRAINT enrollments_estado_check CHECK (estado IN ('confirmed', 'cancelled', 'withdrawn'));

    CREATE UNIQUE INDEX IF NOT EXISTS enrollments_active_course_participant_idx
      ON enrollments (course_id, participant_id)
      WHERE estado NOT IN ('cancelled', 'withdrawn') AND participant_id IS NOT NULL;
  `);

  await query(`UPDATE users SET role = CASE role WHEN 'operator' THEN 'facilitadora' WHEN 'viewer' THEN 'participante' ELSE role END`);
  await query(`UPDATE participants SET phone = COALESCE(phone, phone_dial_code || ' ' || phone_number) WHERE phone IS NULL OR phone = ''`);
}

async function seedAdmin() {
  const existing = await query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users');

  if (Number(existing.rows[0]?.count ?? '0') > 0) {
    return;
  }

  const passwordHash = await bcrypt.hash(requiredBootstrapPassword(), 10);

  await query(
    `INSERT INTO users (email, password_hash, full_name, role, active)
     VALUES ($1, $2, $3, $4, TRUE)`,
    [requiredBootstrapEmail(), passwordHash, 'Admin ACOES', canonicalRoles[0]],
  );
}

export async function ensureDatabase() {
  if (bootstrapped) return;

  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await createTables();
      await seedAdmin();
      bootstrapped = true;
    })();
  }

  await bootstrapPromise;
}
