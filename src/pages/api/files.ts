import type { APIRoute } from 'astro';

import { getCurrentUser } from '../../lib/server/auth';
import { ensureDatabase } from '../../lib/server/bootstrap';
import { query } from '../../lib/server/db';
import { fileStorage, type FileStorageKind } from '../../lib/server/file-storage';

const kinds = new Set<FileStorageKind>(['photo', 'document', 'certificate']);

export const POST: APIRoute = async ({ request, cookies }) => {
  await ensureDatabase();
  const user = await getCurrentUser(cookies);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file');
  const kind = String(formData.get('kind') ?? 'document') as FileStorageKind;
  const entityType = String(formData.get('entityType') ?? '') || null;
  const entityIdValue = String(formData.get('entityId') ?? '');
  const entityId = entityIdValue ? Number(entityIdValue) : null;

  if (!(file instanceof File) || !kinds.has(kind)) return Response.json({ error: 'Invalid upload payload' }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const stored = await fileStorage.save({ bytes, originalName: file.name, mimeType: file.type || 'application/octet-stream', kind });

  const result = await query(
    `INSERT INTO file_objects (storage_key, original_name, mime_type, size_bytes, kind, entity_type, entity_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id, storage_key, original_name, mime_type, size_bytes, kind, entity_type, entity_id, created_at`,
    [stored.storageKey, stored.originalName, stored.mimeType, stored.sizeBytes, kind, entityType, entityId, user.id],
  );

  return Response.json({ data: result.rows[0] }, { status: 201 });
};
