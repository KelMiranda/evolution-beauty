import type { APIRoute } from 'astro';
import { getCurrentUser } from '../../lib/server/auth';
import { ensureDatabase } from '../../lib/server/bootstrap';
import { canViewAuditTrail } from '../../lib/server/permissions';
import { listAuditEvents, countAuditEvents } from '../../lib/server/audit';
import type { AuditEntityType } from '../../lib/server/audit';

export const GET: APIRoute = async ({ url, cookies }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!canViewAuditTrail(user)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const entityType = url.searchParams.get('entityType') as AuditEntityType | null ?? undefined;
  const entityId = url.searchParams.get('entityId') ? Number(url.searchParams.get('entityId')) : undefined;
  const actorUserId = url.searchParams.get('actorUserId') ? Number(url.searchParams.get('actorUserId')) : undefined;
  const action = url.searchParams.get('action') ?? undefined;
  const dateFrom = url.searchParams.get('dateFrom') ?? undefined;
  const dateTo = url.searchParams.get('dateTo') ?? undefined;
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? '50')));
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? '0'));

  const filters = { entityType, entityId, actorUserId, action, dateFrom, dateTo, limit, offset };
  const [events, total] = await Promise.all([
    listAuditEvents(filters),
    countAuditEvents({ entityType, entityId, actorUserId, action, dateFrom, dateTo }),
  ]);

  return new Response(JSON.stringify({
    data: events,
    meta: { total, limit, offset },
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
