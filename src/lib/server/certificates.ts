import { query, withTransaction } from './db';
import { fileStorage } from './file-storage';

import { createNotification, notificationKinds } from './notifications';

type CourseRow = { id: number; name: string; estado: string };
type EnrollmentRow = { id: number; participant_id: number | null; full_name: string; email: string };
type CertificateRow = { id: number; certificate_number: string };

function renderCertificatePdf(input: { certificateNumber: string; participantName: string; courseName: string; completedAt: string }) {
  const lines = [
    'Evolution Beauty Academy',
    'Certificate of Completion',
    `Certificate: ${input.certificateNumber}`,
    `Participant: ${input.participantName}`,
    `Course: ${input.courseName}`,
    `Completed: ${input.completedAt.slice(0, 10)}`,
  ];

  const content = lines.map((line, index) => `BT /F1 18 Tf 72 ${760 - index * 28} Td (${line.replaceAll('(', '\\(').replaceAll(')', '\\)')}) Tj ET`).join('\n');
  const pdf = `%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n5 0 obj << /Length ${content.length + 20} >> stream\nBT /F1 20 Tf 72 760 Td (Evolution Beauty Academy) Tj ET\n${content}\nendstream endobj\nxref\n0 6\n0000000000 65535 f \ntrailer << /Root 1 0 R /Size 6 >>\nstartxref\n0\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

export async function completeCourse(courseId: number, completedBy: number | null) {
  return withTransaction(async (tx) => {
    const courseResult = await tx.query<CourseRow>('SELECT id, name, estado FROM courses WHERE id = $1 LIMIT 1', [courseId]);
    const course = courseResult.rows[0];
    if (!course) return null;

    await tx.query(`UPDATE courses SET estado = 'completed', updated_at = NOW() WHERE id = $1`, [courseId]);

    const enrollments = await tx.query<EnrollmentRow>(
      `SELECT id, participant_id, full_name, email FROM enrollments WHERE course_id = $1 AND estado = 'confirmed'`,
      [courseId],
    );

    const certificates: CertificateRow[] = [];

    for (const enrollment of enrollments.rows) {
      if (!enrollment.participant_id) continue;

      const certificateNumber = `CERT-${courseId}-${enrollment.participant_id}`;
      const completedAt = new Date().toISOString();
      const pdfBytes = renderCertificatePdf({ certificateNumber, participantName: enrollment.full_name, courseName: course.name, completedAt });
      const stored = await fileStorage.save({ bytes: pdfBytes, originalName: `${certificateNumber}.pdf`, mimeType: 'application/pdf', kind: 'certificate' });
      const storedFile = await tx.query<{ id: number }>(
        `INSERT INTO file_objects (storage_key, original_name, mime_type, size_bytes, kind, entity_type, entity_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING id`,
        [stored.storageKey, stored.originalName, stored.mimeType, stored.sizeBytes, 'certificate', 'course', courseId, completedBy],
      );

      const inserted = await tx.query<CertificateRow>(
        `INSERT INTO course_certificates (course_id, participant_id, enrollment_id, certificate_number, pdf_file_id, completed_by)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id, certificate_number`,
        [courseId, enrollment.participant_id, enrollment.id, certificateNumber, storedFile.rows[0]?.id ?? null, completedBy],
      );

      const certificate = inserted.rows[0];
      certificates.push(certificate);

    }

    await createNotification({
      userId: completedBy,
      audienceRole: 'admin',
      kind: notificationKinds.courseCompleted,
      title: 'Curso completado',
      body: `El curso ${course.name} fue marcado como completado.`,
      payload: { courseId },
    });

    return { courseId, certificates };
  });
}

export async function getCertificatePdf(courseId: number, participantId: number) {
  const result = await query<{ certificate_number: string; pdf_file_id: number | null }>(
    `SELECT certificate_number, pdf_file_id FROM course_certificates WHERE course_id = $1 AND participant_id = $2 LIMIT 1`,
    [courseId, participantId],
  );
  return result.rows[0] ?? null;
}
