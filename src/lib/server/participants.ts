import { query, withTransaction } from './db';
import { recordAuditEvent } from './audit';
import { createNotification, notificationKinds } from './notifications';
import { getCourseById } from './courses';
import { normalizeDui } from './dui';

export type Participant = {
  id: number;
  participant_code: string;
  course_id: number | null;
  facilitator_id: number | null;
  full_name: string;
  document_number: string;
  birth_date: string;
  gender: string;
  phone_country: string;
  phone_dial_code: string;
  phone_number: string;
  phone: string;
  email: string | null;
  address: string | null;
  municipality: string | null;
  department: string | null;
  district: string | null;
  organization: string | null;
  role_function: string;
  education_level: string | null;
  program: string | null;
  status: string;
  lifecycle_state: 'active' | 'inactive';
  deleted_at: string | null;
  deleted_by: number | null;
  notes: string | null;
  consent: boolean;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
};

export type ParticipantHistoryEntry = {
  id: number;
  action: string;
  actor_user_id: number | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type ParticipantDuplicateMatch = Pick<Participant, 'id' | 'participant_code' | 'full_name' | 'document_number' | 'email' | 'phone' | 'lifecycle_state' | 'deleted_at'> & {
  match_reason: 'document_number' | 'email' | 'phone';
};

export type ParticipantInput = {
  courseId?: number;
  facilitatorId?: number | null;
  fullName: string;
  documentNumber: string;
  birthDate: string;
  gender: string;
  phoneCountry: string;
  phoneDialCode: string;
  phoneNumber: string;
  phone: string;
  email?: string;
  address?: string;
  municipality?: string;
  department?: string;
  district?: string;
  organization?: string;
  roleFunction: string;
  educationLevel?: string;
  program?: string;
  status: string;
  notes?: string;
  consent: boolean;
};

export type ParticipantFilters = {
  search?: string;
  department?: string;
  status?: string;
  lifecycleState?: 'active' | 'inactive' | 'all';
  limit?: number;
};

type TransactionClient = {
  query: <T extends Record<string, unknown> = Record<string, unknown>>(text: string, values?: unknown[]) => Promise<{ rows: T[] }>;
};

export function buildParticipantCode(id: number, createdAt = new Date()) {
  const datePart = createdAt.toISOString().slice(0, 10).replaceAll('-', '');
  const idPart = String(id).padStart(6, '0');
  return `ACOES-${datePart}-${idPart}`;
}

async function reserveParticipantId(tx: TransactionClient) {
  const result = await tx.query<{ id: string }>(
    `SELECT nextval(pg_get_serial_sequence('participants', 'id'))::text AS id`,
  );

  return Number(result.rows[0]?.id ?? 0);
}

export async function listParticipants(filters: ParticipantFilters = {}) {
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];

  const search = filters.search?.trim();
  const department = filters.department?.trim();
  const status = filters.status?.trim();
  const lifecycleState = filters.lifecycleState?.trim() ?? 'all';
  const limit = filters.limit ?? 100;

  if (search) {
    values.push(`%${search}%`);
    const n = values.length;
    conditions.push(`(full_name ILIKE $${n} OR document_number ILIKE $${n} OR participant_code ILIKE $${n} OR role_function ILIKE $${n} OR education_level ILIKE $${n} OR program ILIKE $${n} OR organization ILIKE $${n} OR phone ILIKE $${n} OR district ILIKE $${n})`);
  }

  if (department) {
    values.push(department);
    conditions.push(`department = $${values.length}`);
  }

  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }

  if (lifecycleState !== 'all') {
    values.push(lifecycleState);
    conditions.push(`lifecycle_state = $${values.length}`);
  }

  values.push(limit);

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query<Participant>(
    `SELECT * FROM participants
     ${whereClause}
     ORDER BY created_at DESC, id DESC
     LIMIT $${values.length}`,
    values,
  );

  return result.rows;
}

/**
 * Count participants matching the same filter set as `listParticipants`.
 *
 * Used by the `GET /api/participants` endpoint to include `total` in the
 * pagination meta so the SPA can render "Mostrando X de Y" without
 * second-guessing the page math. Mirrors the `countAuditEvents` /
 * `listAuditEvents` pairing in `audit.ts`.
 *
 * Excludes soft-deleted rows, matching `listParticipants` policy.
 */
export async function countParticipants(filters: ParticipantFilters = {}): Promise<number> {
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];

  const search = filters.search?.trim();
  const department = filters.department?.trim();
  const status = filters.status?.trim();
  const lifecycleState = filters.lifecycleState?.trim() ?? 'all';

  if (search) {
    values.push(`%${search}%`);
    const n = values.length;
    conditions.push(`(full_name ILIKE $${n} OR document_number ILIKE $${n} OR participant_code ILIKE $${n} OR role_function ILIKE $${n} OR education_level ILIKE $${n} OR program ILIKE $${n} OR organization ILIKE $${n} OR phone ILIKE $${n} OR district ILIKE $${n})`);
  }

  if (department) {
    values.push(department);
    conditions.push(`department = $${values.length}`);
  }

  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }

  if (lifecycleState !== 'all') {
    values.push(lifecycleState);
    conditions.push(`lifecycle_state = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM participants ${whereClause}`,
    values,
  );

  return Number(result.rows[0]?.count ?? 0);
}

export async function getParticipantMetrics() {
  const result = await query<{ total: string; today: string; consent: string; email: string; active: string; inactive: string }>(
    `SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)::text AS today,
      COUNT(*) FILTER (WHERE consent = TRUE)::text AS consent,
      COUNT(*) FILTER (WHERE COALESCE(email, '') <> '')::text AS email,
      COUNT(*) FILTER (WHERE lifecycle_state = 'active' AND deleted_at IS NULL)::text AS active,
      COUNT(*) FILTER (WHERE lifecycle_state = 'inactive' AND deleted_at IS NULL)::text AS inactive
     FROM participants`,
  );

  const row = result.rows[0] ?? { total: '0', today: '0', consent: '0', email: '0', active: '0', inactive: '0' };

  return {
    total: Number(row.total),
    today: Number(row.today),
    consent: Number(row.consent),
    email: Number(row.email),
    active: Number(row.active),
    inactive: Number(row.inactive),
  };
}

export type ParticipantIndicators = {
  byDepartment: Record<string, number>;
  byProgram: Record<string, number>;
  byEducationLevel: Record<string, number>;
  byRoleFunction: Record<string, number>;
  byGender: Record<string, number>;
};

export async function getParticipantIndicators(dateFrom?: string, dateTo?: string): Promise<ParticipantIndicators> {
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];

  if (dateFrom) {
    values.push(dateFrom);
    conditions.push(`created_at >= $${values.length}`);
  }

  if (dateTo) {
    values.push(dateTo);
    conditions.push(`created_at <= $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [deptResult, progResult, eduResult, roleResult, genderResult] = await Promise.all([
    query<{ department: string; count: string }>(`SELECT COALESCE(department, 'Sin especificar') AS department, COUNT(*)::text AS count FROM participants ${whereClause} GROUP BY department ORDER BY count DESC`, values),
    query<{ program: string; count: string }>(`SELECT COALESCE(program, 'Sin especificar') AS program, COUNT(*)::text AS count FROM participants ${whereClause} GROUP BY program ORDER BY count DESC`, values),
    query<{ education_level: string; count: string }>(`SELECT COALESCE(education_level, 'Sin especificar') AS education_level, COUNT(*)::text AS count FROM participants ${whereClause} GROUP BY education_level ORDER BY count DESC`, values),
    query<{ role_function: string; count: string }>(`SELECT role_function, COUNT(*)::text AS count FROM participants ${whereClause} GROUP BY role_function ORDER BY count DESC`, values),
    query<{ gender: string; count: string }>(`SELECT gender, COUNT(*)::text AS count FROM participants ${whereClause} GROUP BY gender ORDER BY count DESC`, values),
  ]);

  const byDepartment: Record<string, number> = {};
  for (const row of deptResult.rows) {
    byDepartment[row.department] = Number(row.count);
  }

  const byProgram: Record<string, number> = {};
  for (const row of progResult.rows) {
    byProgram[row.program] = Number(row.count);
  }

  const byEducationLevel: Record<string, number> = {};
  for (const row of eduResult.rows) {
    byEducationLevel[row.education_level] = Number(row.count);
  }

  const byRoleFunction: Record<string, number> = {};
  for (const row of roleResult.rows) {
    byRoleFunction[row.role_function] = Number(row.count);
  }

  const byGender: Record<string, number> = {};
  for (const row of genderResult.rows) {
    byGender[row.gender] = Number(row.count);
  }

  return { byDepartment, byProgram, byEducationLevel, byRoleFunction, byGender };
}

export async function createParticipant(input: ParticipantInput, createdBy: number | null) {
  return withTransaction(async (tx) => {
    let facilitatorId = input.facilitatorId ?? null;
    if (facilitatorId == null && input.courseId) {
      const course = await getCourseById(input.courseId, { includeHidden: true });
      facilitatorId = course?.facilitator_id ?? null;
    }

    const id = await reserveParticipantId(tx);
    const participantCode = buildParticipantCode(id);

    const result = await tx.query<Participant>(
      `INSERT INTO participants (
        id, participant_code, course_id, facilitator_id, full_name, document_number, birth_date, gender, phone_country, phone_dial_code, phone_number, phone,
        email, address, municipality, department, district, organization, role_function, education_level, program, status,
        lifecycle_state, notes, consent, created_by, updated_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
      RETURNING *`,
      [
        id,
        participantCode,
        input.courseId ?? null,
        facilitatorId,
        input.fullName,
        input.documentNumber,
        input.birthDate,
        input.gender,
        input.phoneCountry,
        input.phoneDialCode,
        input.phoneNumber,
        input.phone,
        input.email ?? null,
        input.address ?? null,
        input.municipality ?? null,
        input.department ?? null,
        input.district ?? null,
        input.organization ?? null,
        input.roleFunction,
        input.educationLevel ?? null,
        input.program ?? null,
        input.status,
        'active',
        input.notes ?? null,
        input.consent,
        createdBy,
        createdBy,
      ],
    );

    const participant = result.rows[0];

    await recordAuditEvent(tx, {
      entityType: 'participant',
      entityId: participant.id,
      action: 'create',
      actorUserId: createdBy,
      afterData: participant,
      metadata: { participant_code: participant.participant_code },
    });

    if (input.roleFunction === 'Facilitador' || input.status === 'Pendiente' || input.status === 'Revisar') {
      await createNotification({
        userId: createdBy,
        audienceRole: 'admin',
        kind: notificationKinds.facilitatorPending,
        title: 'Facilitador pendiente de validación',
        body: `${participant.full_name} requiere validación interna.`,
        payload: { participantId: participant.id, participantCode: participant.participant_code },
      });
    }

    return participant;
  });
}

export async function updateParticipant(id: number, patch: Partial<ParticipantInput>, updatedBy: number | null) {
  return withTransaction(async (tx) => {
    const current = await tx.query<Participant>('SELECT * FROM participants WHERE id = $1 LIMIT 1', [id]);
    const before = current.rows[0];
    if (!before) return null;

    const next = {
      fullName: patch.fullName ?? before.full_name,
      documentNumber: patch.documentNumber ?? before.document_number,
      birthDate: patch.birthDate ?? before.birth_date,
      gender: patch.gender ?? before.gender,
      phoneCountry: patch.phoneCountry ?? before.phone_country,
      phoneDialCode: patch.phoneDialCode ?? before.phone_dial_code,
      phoneNumber: patch.phoneNumber ?? before.phone_number,
      phone: patch.phone ?? before.phone,
      email: patch.email ?? before.email,
      address: patch.address ?? before.address,
      municipality: patch.municipality ?? before.municipality,
      department: patch.department ?? before.department,
      district: patch.district ?? before.district,
      organization: patch.organization ?? before.organization,
      roleFunction: patch.roleFunction ?? before.role_function,
      educationLevel: patch.educationLevel ?? before.education_level ?? undefined,
      program: patch.program ?? before.program ?? undefined,
      status: patch.status ?? before.status,
      notes: patch.notes ?? before.notes ?? undefined,
      consent: patch.consent ?? before.consent,
    };

    const result = await tx.query<Participant>(
      `UPDATE participants SET
        full_name = $2,
        document_number = $3,
        birth_date = $4,
        gender = $5,
        phone_country = $6,
        phone_dial_code = $7,
        phone_number = $8,
        phone = $9,
        email = $10,
        address = $11,
        municipality = $12,
        department = $13,
        district = $14,
        organization = $15,
        role_function = $16,
        education_level = $17,
        program = $18,
        status = $19,
        notes = $20,
        consent = $21,
        updated_by = $22,
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        next.fullName,
        next.documentNumber,
        next.birthDate,
        next.gender,
        next.phoneCountry,
        next.phoneDialCode,
        next.phoneNumber,
        next.phone,
        next.email ?? null,
        next.address ?? null,
        next.municipality ?? null,
        next.department ?? null,
        next.district ?? null,
        next.organization ?? null,
        next.roleFunction,
        next.educationLevel ?? null,
        next.program ?? null,
        next.status,
        next.notes ?? null,
        next.consent ?? before.consent,
        updatedBy,
      ],
    );

    const updated = result.rows[0];
    await recordAuditEvent(tx, {
      entityType: 'participant',
      entityId: id,
      action: 'update',
      actorUserId: updatedBy,
      beforeData: before,
      afterData: updated,
    });

    return updated;
  });
}

export async function softDeleteParticipant(id: number, deletedBy: number | null) {
  return withTransaction(async (tx) => {
    const current = await tx.query<Participant>('SELECT * FROM participants WHERE id = $1 LIMIT 1', [id]);
    const before = current.rows[0];
    if (!before) return null;

    const result = await tx.query<Participant>(
      `UPDATE participants
       SET lifecycle_state = 'inactive',
           deleted_at = NOW(),
           deleted_by = $2,
           updated_by = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, deletedBy],
    );

    const after = result.rows[0];
    await recordAuditEvent(tx, {
      entityType: 'participant',
      entityId: id,
      action: 'soft_delete',
      actorUserId: deletedBy,
      beforeData: before,
      afterData: after,
    });

    return after;
  });
}

export async function restoreParticipant(id: number, restoredBy: number | null) {
  return withTransaction(async (tx) => {
    const current = await tx.query<Participant>('SELECT * FROM participants WHERE id = $1 LIMIT 1', [id]);
    const before = current.rows[0];
    if (!before) return null;

    const result = await tx.query<Participant>(
      `UPDATE participants
       SET lifecycle_state = 'active',
           deleted_at = NULL,
           deleted_by = NULL,
           updated_by = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, restoredBy],
    );

    const after = result.rows[0];
    await recordAuditEvent(tx, {
      entityType: 'participant',
      entityId: id,
      action: 'restore',
      actorUserId: restoredBy,
      beforeData: before,
      afterData: after,
    });

    return after;
  });
}

export async function setParticipantLifecycle(id: number, lifecycleState: 'active' | 'inactive', actorUserId: number | null) {
  if (lifecycleState === 'active') {
    return restoreParticipant(id, actorUserId);
  }

  return softDeleteParticipant(id, actorUserId);
}

export async function getParticipantById(id: number) {
  const result = await query<Participant>('SELECT * FROM participants WHERE id = $1 LIMIT 1', [id]);
  return result.rows[0] ?? null;
}

export type GetParticipantByDocumentNumberOptions = {
  /** Include soft-deleted participants (default: false, matches `listParticipants`). */
  includeDeleted?: boolean;
  /** Reuse an open transaction client instead of the global pool. */
  tx?: TransactionClient;
};

/**
 * Look up a participant by their normalized document number (DUI).
 *
 * The input is normalized via `normalizeDui` so callers do not need to
 * pre-format it; `000000000` and `00000 000-0` both match a row stored
 * as `00000000-0`. Soft-deleted participants are excluded by default to
 * match `listParticipants` policy.
 *
 * Returns `null` for any input that does not normalize to the canonical
 * format, or when no row matches.
 */
export async function getParticipantByDocumentNumber(
  documentNumber: string,
  options: GetParticipantByDocumentNumberOptions = {},
): Promise<Participant | null> {
  const canonical = normalizeDui(documentNumber);
  if (!canonical) return null;

  const whereDeleted = options.includeDeleted ? '' : 'AND deleted_at IS NULL';
  const sql = `SELECT * FROM participants WHERE document_number = $1 ${whereDeleted} LIMIT 1`;
  const params = [canonical];

  if (options.tx) {
    const result = await options.tx.query<Participant>(sql, params);
    return result.rows[0] ?? null;
  }

  const result = await query<Participant>(sql, params);
  return result.rows[0] ?? null;
}

export async function getParticipantAuditTrail(id: number) {
  const result = await query<{
    id: number;
    entity_type: string;
    entity_id: number;
    action: string;
    actor_user_id: number | null;
    before_data: Record<string, unknown> | null;
    after_data: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  }>(
    `SELECT id, entity_type, entity_id, action, actor_user_id, before_data, after_data, metadata, created_at
     FROM audit_events
     WHERE entity_type = 'participant' AND entity_id = $1
     ORDER BY created_at ASC, id ASC`,
    [id],
  );

  return result.rows;
}

export async function getParticipantHistory(id: number): Promise<ParticipantHistoryEntry[]> {
  const result = await query<ParticipantHistoryEntry>(
    `SELECT id, action, actor_user_id, before_data, after_data, metadata, created_at
     FROM audit_events
     WHERE entity_type = 'participant' AND entity_id = $1
     ORDER BY created_at ASC, id ASC`,
    [id],
  );

  return result.rows;
}

export async function findParticipantDuplicates(input: Pick<ParticipantInput, 'documentNumber' | 'email' | 'phone'> & { participantId?: number }) {
  const matches: string[] = [];
  const exclusions: string[] = [];
  const values: unknown[] = [];

  if (input.documentNumber.trim()) {
    values.push(input.documentNumber.trim());
    matches.push(`document_number = $${values.length}`);
  }

  if (input.email?.trim()) {
    values.push(input.email.trim().toLowerCase());
    matches.push(`LOWER(COALESCE(email, '')) = $${values.length}`);
  }

  if (input.phone.trim()) {
    values.push(input.phone.trim());
    matches.push(`phone = $${values.length}`);
  }

  if (matches.length === 0) {
    return [];
  }

  if (input.participantId !== undefined) {
    values.push(input.participantId);
    exclusions.push(`id <> $${values.length}`);
  }

  const filters = [...exclusions, ...matches];

  const result = await query<Participant>(
    `SELECT * FROM participants
     WHERE deleted_at IS NULL AND ${filters.map((filter) => `(${filter})`).join(' AND ')}
     ORDER BY created_at DESC, id DESC`,
    values,
  );

  return result.rows.map<ParticipantDuplicateMatch>((participant) => {
    const matchReason = participant.document_number === input.documentNumber.trim()
      ? 'document_number'
      : participant.email && input.email?.trim() && participant.email.toLowerCase() === input.email.trim().toLowerCase()
        ? 'email'
        : 'phone';

    return { ...participant, match_reason: matchReason };
  });
}

export function mapParticipantExportRows(participants: Participant[]) {
  const headers = [
    'ID', 'Código', 'Nombre completo', 'Documento', 'Nacimiento', 'Género', 'País', 'Prefijo', 'Número', 'Teléfono completo', 'Correo',
    'Dirección', 'Municipio', 'Departamento', 'Distrito', 'Entidad', 'Función', 'Nivel educativo', 'Programa', 'Estado', 'Vigencia', 'Consentimiento', 'Creado',
  ];

  const rows = participants.map((participant) => [
    participant.id,
    participant.participant_code,
    participant.full_name,
    participant.document_number,
    participant.birth_date,
    participant.gender,
    participant.phone_country,
    participant.phone_dial_code,
    participant.phone_number,
    `${participant.phone_dial_code} ${participant.phone_number}`,
    participant.email ?? '',
    participant.address ?? '',
    participant.municipality ?? '',
    participant.department ?? '',
    participant.district ?? '',
    participant.organization ?? '',
    participant.role_function,
    participant.education_level ?? '',
    participant.program ?? '',
    participant.status,
    participant.lifecycle_state,
    participant.consent ? 'Sí' : 'No',
    participant.created_at,
  ]);

  return { headers, rows };
}

export function exportParticipantsCsv(participants: Participant[]) {
  const headers = [
    'ID', 'Código', 'Nombre completo', 'Documento', 'Nacimiento', 'Género', 'País', 'Prefijo', 'Número', 'Teléfono completo', 'Correo',
    'Dirección', 'Municipio', 'Departamento', 'Distrito', 'Entidad', 'Función', 'Nivel educativo', 'Programa', 'Estado', 'Vigencia', 'Consentimiento', 'Creado'
  ];

  const rows = participants.map((participant) => [
    participant.id,
    participant.participant_code,
    participant.full_name,
    participant.document_number,
    participant.birth_date,
    participant.gender,
    participant.phone_country,
    participant.phone_dial_code,
    participant.phone_number,
    `${participant.phone_dial_code} ${participant.phone_number}`,
    participant.email ?? '',
    participant.address ?? '',
    participant.municipality ?? '',
    participant.department ?? '',
    participant.district ?? '',
    participant.organization ?? '',
    participant.role_function,
    participant.education_level ?? '',
    participant.program ?? '',
    participant.status,
    participant.lifecycle_state,
    participant.consent ? 'Sí' : 'No',
    participant.created_at,
  ]);

  return [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\n');
}
