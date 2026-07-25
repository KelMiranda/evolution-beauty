import type { APIRoute } from 'astro';

import { getCurrentUser } from '../../../../lib/server/auth';
import { ensureDatabase } from '../../../../lib/server/bootstrap';
import { query } from '../../../../lib/server/db';
import { getCertificatePdf } from '../../../../lib/server/certificates';
import { fileStorage } from '../../../../lib/server/file-storage';

export const GET: APIRoute = async ({ params, url, cookies }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const courseId = Number(params.id);
  const participantId = Number(url.searchParams.get('participantId'));
  if (!Number.isFinite(courseId) || !Number.isFinite(participantId)) {
    return new Response('Invalid parameters', { status: 400 });
  }

  const certificate = await getCertificatePdf(courseId, participantId);
  if (!certificate) return new Response('Not found', { status: 404 });

  const file = await query<{ storage_key: string; mime_type: string }>('SELECT storage_key, mime_type FROM file_objects WHERE id = $1 LIMIT 1', [certificate.pdf_file_id]);
  const fileRow = file.rows[0];
  if (!fileRow) return new Response('Not found', { status: 404 });

  const bytes = await fileStorage.read(fileRow.storage_key);

  return new Response(Buffer.from(bytes), {
    headers: {
      'Content-Type': fileRow.mime_type,
      'Content-Disposition': `attachment; filename="${certificate.certificate_number}.pdf"`,
    },
  });
};
