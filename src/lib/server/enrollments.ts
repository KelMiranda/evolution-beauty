import { query, withTransaction } from './db';
import { recordAuditEvent } from './audit';
import { isEnrollableCourseState } from './courses';

export type Enrollment = {
  id: number;
  course_id: number;
  participant_id: number | null;
  enrolled_by: number | null;
  full_name: string;
  email: string;
  phone: string;
  dui: string | null;
  fecha_inscripcion: string;
  estado: string;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

export type EnrollmentInput = {
  courseId: number;
  participantId?: number;
  enrolledBy?: number;
  fullName: string;
  email: string;
  phone: string;
  dui?: string;
  notas?: string;
};

export type EnrollmentFilters = {
  courseId?: number;
  participantId?: number;
  estado?: string;
};

export async function listEnrollments(filters: EnrollmentFilters = {}) {
  const conditions: string[] = [];
  const values: unknown[] = [];

  const courseId = filters.courseId;
  const participantId = filters.participantId;
  const estado = filters.estado?.trim();

  if (courseId !== undefined) {
    values.push(courseId);
    conditions.push(`course_id = $${values.length}`);
  }

  if (participantId !== undefined) {
    values.push(participantId);
    conditions.push(`participant_id = $${values.length}`);
  }

  if (estado) {
    values.push(estado);
    conditions.push(`estado = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query<Enrollment>(
    `SELECT * FROM enrollments
     ${whereClause}
     ORDER BY created_at DESC, id DESC`,
    values,
  );

  return result.rows;
}

export async function getEnrollmentById(id: number) {
  const result = await query<Enrollment>('SELECT * FROM enrollments WHERE id = $1 LIMIT 1', [id]);
  return result.rows[0] ?? null;
}

export async function createEnrollment(input: EnrollmentInput) {
  return withTransaction(async (tx) => {
    const courseCheck = await tx.query<{ cupo_maximo: number; inscritos: number; estado: string }>(
      `SELECT cupo_maximo, inscritos, estado FROM courses WHERE id = $1 LIMIT 1`,
      [input.courseId],
    );

    if (courseCheck.rows.length === 0 || !isEnrollableCourseState(courseCheck.rows[0].estado)) {
      throw new Error('El curso no está disponible para inscripción');
    }

    const existing = await tx.query<{ id: number }>(
      `SELECT id FROM enrollments
       WHERE course_id = $1 AND participant_id IS NOT NULL AND participant_id = $2 AND estado NOT IN ('cancelled', 'withdrawn')
       LIMIT 1`,
      [input.courseId, input.participantId ?? null],
    );

    if (existing.rows.length > 0) {
      throw new Error('Ya estás inscrito en este curso');
    }

    const course = courseCheck.rows[0];

    if (course.inscritos >= course.cupo_maximo) {
      throw new Error('El curso ha alcanzado su cupo máximo');
    }

    const result = await tx.query<Enrollment>(
      `INSERT INTO enrollments (
        course_id, participant_id, enrolled_by, full_name, email, phone, dui, estado, notas
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmed',$8)
      RETURNING *`,
      [
        input.courseId,
        input.participantId ?? null,
        input.enrolledBy ?? null,
        input.fullName,
        input.email,
        input.phone,
        input.dui ?? null,
        input.notas ?? null,
      ],
    );

    const enrollment = result.rows[0];

    await tx.query(
      `UPDATE courses SET inscritos = inscritos + 1, updated_at = NOW() WHERE id = $1`,
      [input.courseId],
    );

    await recordAuditEvent(tx, {
      entityType: 'enrollment',
      entityId: enrollment.id,
      action: 'create',
      actorUserId: input.enrolledBy ?? null,
      afterData: enrollment,
      metadata: { courseId: input.courseId },
    });

    return enrollment;
  });
}

export async function updateEnrollmentState(id: number, estado: string, updatedBy: number | null) {
  return withTransaction(async (tx) => {
    const current = await tx.query<Enrollment>('SELECT * FROM enrollments WHERE id = $1 LIMIT 1', [id]);
    const before = current.rows[0];
    if (!before) return null;

    const previousEstado = before.estado;

    const result = await tx.query<Enrollment>(
      `UPDATE enrollments SET
        estado = $2,
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, estado],
    );

    const updated = result.rows[0];

    if (previousEstado === 'confirmed' && estado !== 'confirmed') {
      await tx.query(
        `UPDATE courses SET inscritos = GREATEST(0, inscritos - 1), updated_at = NOW() WHERE id = $1`,
        [before.course_id],
      );
    } else if (previousEstado !== 'confirmed' && estado === 'confirmed') {
      await tx.query(
        `UPDATE courses SET inscritos = inscritos + 1, updated_at = NOW() WHERE id = $1`,
        [before.course_id],
      );
    }

    await recordAuditEvent(tx, {
      entityType: 'enrollment',
      entityId: id,
      action: 'state_change',
      actorUserId: updatedBy,
      beforeData: before,
      afterData: updated,
      metadata: { previousEstado, newEstado: estado },
    });

    return updated;
  });
}

export async function cancelEnrollment(id: number, cancelledBy: number | null) {
  return updateEnrollmentState(id, 'cancelled', cancelledBy);
}

export async function withdrawEnrollment(id: number, withdrawnBy: number | null) {
  return updateEnrollmentState(id, 'withdrawn', withdrawnBy);
}

export async function getEnrollmentCountByCourse(courseId: number) {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM enrollments WHERE course_id = $1 AND estado NOT IN ('cancelled', 'withdrawn')`,
    [courseId],
  );
  return Number(result.rows[0]?.count ?? 0);
}
