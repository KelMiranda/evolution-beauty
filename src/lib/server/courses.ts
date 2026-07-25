import { query, withTransaction } from './db';
import { recordAuditEvent } from './audit';
import { createNotification, notificationKinds } from './notifications';

const readableCourseStates = ['published', 'enrolling', 'in_progress'] as const;
const enrollableCourseStates = ['enrolling'] as const;

export type Course = {
  id: number;
  name: string;
  description: string;
  category: string;
  level: string;
  facilitator_id: number | null;
  instructor: string;
  instructor_bio: string | null;
  price: number;
  price_original: number | null;
  image: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  horario: string;
  ubicacion: string;
  departamento: string | null;
  municipio: string | null;
  lat: number | null;
  lng: number | null;
  cupo_maximo: number;
  inscritos: number;
  estado: string;
  tags: string[] | null;
  public_enrollment_token: string | null;
  created_at: string;
  updated_at: string;
};

export function generateCourseEnrollmentToken(courseId: number, facilitator: string) {
  const normalizedFacilitator = facilitator.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const tokenBase = `${courseId}-${normalizedFacilitator || 'facilitator'}`;
  return `${tokenBase}-${Math.random().toString(36).slice(2, 10)}`;
}

export type CourseInput = {
  name: string;
  description: string;
  category: string;
  level: string;
  facilitatorId?: number | null;
  instructor: string;
  instructorBio?: string;
  price: number;
  priceOriginal?: number;
  image?: string;
  fechaInicio: string;
  fechaFin: string;
  horario: string;
  ubicacion: string;
  departamento?: string;
  municipio?: string;
  lat?: number;
  lng?: number;
  cupoMaximo: number;
  estado: string;
  tags?: string[];
};

export type CourseFilters = {
  search?: string;
  category?: string;
  nivel?: string;
  estado?: string;
};

export type CourseLookupOptions = {
  includeHidden?: boolean;
};

function applyStateVisibility(values: unknown[], conditions: string[]) {
  values.push([...readableCourseStates]);
  conditions.push(`estado = ANY($${values.length}::text[])`);
}

export function isReadableCourseState(state: string) {
  return readableCourseStates.includes(state as (typeof readableCourseStates)[number]);
}

export function isEnrollableCourseState(state: string) {
  return enrollableCourseStates.includes(state as (typeof enrollableCourseStates)[number]);
}

export async function listCourses(filters: CourseFilters = {}, options: CourseLookupOptions = {}) {
  const conditions: string[] = [];
  const values: unknown[] = [];

  const search = filters.search?.trim();
  const category = filters.category?.trim();
  const nivel = filters.nivel?.trim();
  const estado = filters.estado?.trim();

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(name ILIKE $${values.length} OR description ILIKE $${values.length} OR instructor ILIKE $${values.length})`);
  }

  if (category) {
    values.push(category);
    conditions.push(`category = $${values.length}`);
  }

  if (nivel) {
    values.push(nivel);
    conditions.push(`level = $${values.length}`);
  }

  if (estado) {
    values.push(estado);
    conditions.push(`estado = $${values.length}`);
  }

  if (!options.includeHidden) {
    applyStateVisibility(values, conditions);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query<Course>(
    `SELECT * FROM courses
     ${whereClause}
     ORDER BY fecha_inicio DESC, id DESC`,
    values,
  );

  return result.rows;
}

export async function getCourseById(id: number, options: CourseLookupOptions = {}) {
  if (options.includeHidden) {
    const result = await query<Course>('SELECT * FROM courses WHERE id = $1 LIMIT 1', [id]);
    return result.rows[0] ?? null;
  }

  const result = await query<Course>(
    `SELECT * FROM courses
     WHERE id = $1
       AND estado = ANY($2::text[])
     LIMIT 1`,
    [id, [...readableCourseStates]],
  );
  return result.rows[0] ?? null;
}

export async function getCourseByPublicEnrollmentToken(token: string) {
  const normalizedToken = token.trim();
  if (!normalizedToken) return null;

  const result = await query<Course>(
    `SELECT * FROM courses
     WHERE public_enrollment_token = $1
     LIMIT 1`,
    [normalizedToken],
  );

  return result.rows[0] ?? null;
}

export async function createCourse(input: CourseInput, createdBy: number | null) {
  return withTransaction(async (tx) => {
    const result = await tx.query<Course>(
      `INSERT INTO courses (
        name, description, category, level, facilitator_id, instructor, instructor_bio, price, price_original,
        image, fecha_inicio, fecha_fin, horario, ubicacion, departamento, municipio, lat, lng, cupo_maximo, inscritos,
        estado, tags, public_enrollment_token, created_by, updated_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
      RETURNING *`,
      [
        input.name,
        input.description,
        input.category,
        input.level,
        input.facilitatorId ?? null,
        input.instructor,
        input.instructorBio ?? null,
        input.price,
        input.priceOriginal ?? null,
        input.image ?? null,
        input.fechaInicio,
        input.fechaFin,
        input.horario,
        input.ubicacion,
        input.departamento ?? null,
        input.municipio ?? null,
        input.lat ?? null,
        input.lng ?? null,
        input.cupoMaximo,
        0,
        input.estado,
        input.tags ? JSON.stringify(input.tags) : null,
        null,
        createdBy,
        createdBy,
      ],
    );

    const course = result.rows[0];

    await recordAuditEvent(tx, {
      entityType: 'course',
      entityId: course.id,
      action: 'create',
      actorUserId: createdBy,
      afterData: course,
    });

    if (course.cupo_maximo <= course.inscritos) {
      await createNotification({
        userId: createdBy,
        audienceRole: 'admin',
        kind: notificationKinds.courseFull,
        title: 'Curso lleno',
        body: `El curso ${course.name} quedó lleno al crearse.`,
        payload: { courseId: course.id },
      });
    }

    return course;
  });
}

export async function updateCourse(id: number, patch: Partial<CourseInput>, updatedBy: number | null) {
  return withTransaction(async (tx) => {
    const current = await tx.query<Course>('SELECT * FROM courses WHERE id = $1 LIMIT 1', [id]);
    const before = current.rows[0];
    if (!before) return null;

    const next = {
      name: patch.name ?? before.name,
      description: patch.description ?? before.description,
      category: patch.category ?? before.category,
      level: patch.level ?? before.level,
      facilitatorId: patch.facilitatorId ?? before.facilitator_id,
      instructor: patch.instructor ?? before.instructor,
      instructorBio: patch.instructorBio ?? before.instructor_bio,
      price: patch.price ?? before.price,
      priceOriginal: patch.priceOriginal ?? before.price_original,
      image: patch.image ?? before.image,
      fechaInicio: patch.fechaInicio ?? before.fecha_inicio,
      fechaFin: patch.fechaFin ?? before.fecha_fin,
      horario: patch.horario ?? before.horario,
      ubicacion: patch.ubicacion ?? before.ubicacion,
      departamento: patch.departamento ?? before.departamento,
      municipio: patch.municipio ?? before.municipio,
      lat: patch.lat ?? before.lat,
      lng: patch.lng ?? before.lng,
      cupoMaximo: patch.cupoMaximo ?? before.cupo_maximo,
      estado: patch.estado ?? before.estado,
      tags: patch.tags ?? (before.tags ?? []),
    };

    const result = await tx.query<Course>(
      `UPDATE courses SET
        name = $2,
        description = $3,
        category = $4,
        level = $5,
        facilitator_id = $6,
        instructor = $7,
        instructor_bio = $8,
        price = $9,
        price_original = $10,
        image = $11,
        fecha_inicio = $12,
        fecha_fin = $13,
        horario = $14,
        ubicacion = $15,
        departamento = $16,
        municipio = $17,
        lat = $18,
        lng = $19,
        cupo_maximo = $20,
        estado = $21,
        tags = $22,
        public_enrollment_token = $23,
        updated_by = $24,
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        next.name,
        next.description,
        next.category,
        next.level,
        next.facilitatorId ?? null,
        next.instructor,
        next.instructorBio ?? null,
        next.price,
        next.priceOriginal ?? null,
        next.image ?? null,
        next.fechaInicio,
        next.fechaFin,
        next.horario,
        next.ubicacion,
        next.departamento ?? null,
        next.municipio ?? null,
        next.lat ?? null,
        next.lng ?? null,
        next.cupoMaximo,
        next.estado,
        JSON.stringify(next.tags),
        before.public_enrollment_token,
        updatedBy,
      ],
    );

    const updated = result.rows[0];

    await recordAuditEvent(tx, {
      entityType: 'course',
      entityId: id,
      action: 'update',
      actorUserId: updatedBy,
      beforeData: before,
      afterData: updated,
    });

    return updated;
  });
}

export async function deleteCourse(id: number, deletedBy: number | null) {
  return withTransaction(async (tx) => {
    const current = await tx.query<Course>('SELECT * FROM courses WHERE id = $1 LIMIT 1', [id]);
    const before = current.rows[0];
    if (!before) return null;

    await tx.query('DELETE FROM enrollments WHERE course_id = $1', [id]);

    await tx.query('DELETE FROM courses WHERE id = $1', [id]);

    await recordAuditEvent(tx, {
      entityType: 'course',
      entityId: id,
      action: 'delete',
      actorUserId: deletedBy,
      beforeData: before,
    });

    return before;
  });
}

export async function incrementCourseInscritos(courseId: number) {
  await query(
    `UPDATE courses SET inscritos = inscritos + 1, updated_at = NOW() WHERE id = $1`,
    [courseId],
  );
}

export async function decrementCourseInscritos(courseId: number) {
  await query(
    `UPDATE courses SET inscritos = GREATEST(0, inscritos - 1), updated_at = NOW() WHERE id = $1`,
    [courseId],
  );
}
