import { query } from './db';

export type AuditEntityType = 'participant' | 'session' | 'user' | 'course' | 'enrollment';

export type AuditEventPayload = {
  entityType: AuditEntityType;
  entityId: number;
  action: string;
  actorUserId: number | null;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

export type AuditEventFilters = {
  entityType?: AuditEntityType;
  entityId?: number;
  actorUserId?: number;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
};

export type AuditEventRow = {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  actor_user_id: number | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type QueryClient = {
  query: <T extends Record<string, unknown> = Record<string, unknown>>(text: string, values?: unknown[]) => Promise<{ rows: T[] }>;
};

export async function recordAuditEvent(client: QueryClient, payload: AuditEventPayload) {
  await client.query(
    `INSERT INTO audit_events (
      entity_type, entity_id, action, actor_user_id, before_data, after_data, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      payload.entityType,
      payload.entityId,
      payload.action,
      payload.actorUserId,
      payload.beforeData ?? null,
      payload.afterData ?? null,
      payload.metadata ?? null,
    ],
  );
}

export async function listAuditEvents(filters: AuditEventFilters = {}): Promise<AuditEventRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filters.entityType) {
    values.push(filters.entityType);
    conditions.push(`entity_type = $${values.length}`);
  }

  if (filters.entityId !== undefined) {
    values.push(filters.entityId);
    conditions.push(`entity_id = $${values.length}`);
  }

  if (filters.actorUserId !== undefined) {
    values.push(filters.actorUserId);
    conditions.push(`actor_user_id = $${values.length}`);
  }

  if (filters.action) {
    values.push(filters.action);
    conditions.push(`action = $${values.length}`);
  }

  if (filters.dateFrom) {
    values.push(filters.dateFrom);
    conditions.push(`created_at >= $${values.length}`);
  }

  if (filters.dateTo) {
    values.push(filters.dateTo);
    conditions.push(`created_at <= $${values.length}`);
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  values.push(limit);
  values.push(offset);

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query<AuditEventRow>(
    `SELECT id, entity_type, entity_id, action, actor_user_id, before_data, after_data, metadata, created_at
     FROM audit_events
     ${whereClause}
     ORDER BY created_at DESC, id DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );

  return result.rows;
}

export async function countAuditEvents(filters: AuditEventFilters = {}): Promise<number> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filters.entityType) {
    values.push(filters.entityType);
    conditions.push(`entity_type = $${values.length}`);
  }

  if (filters.entityId !== undefined) {
    values.push(filters.entityId);
    conditions.push(`entity_id = $${values.length}`);
  }

  if (filters.actorUserId !== undefined) {
    values.push(filters.actorUserId);
    conditions.push(`actor_user_id = $${values.length}`);
  }

  if (filters.action) {
    values.push(filters.action);
    conditions.push(`action = $${values.length}`);
  }

  if (filters.dateFrom) {
    values.push(filters.dateFrom);
    conditions.push(`created_at >= $${values.length}`);
  }

  if (filters.dateTo) {
    values.push(filters.dateTo);
    conditions.push(`created_at <= $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM audit_events ${whereClause}`,
    values,
  );

  return Number(result.rows[0]?.count ?? 0);
}

export async function listAuditEventsByEntity(entityType: AuditEntityType, entityId: number) {
  return listAuditEvents({ entityType, entityId });
}
