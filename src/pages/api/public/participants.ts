import type { APIRoute } from 'astro';

import { ensureDatabase } from '../../../lib/server/bootstrap';
import { createParticipant, findParticipantDuplicates } from '../../../lib/server/participants';
import { createNotification, notificationKinds } from '../../../lib/server/notifications';
import { validateParticipantSubmission } from '../../../lib/server/participant-schema';

export const POST: APIRoute = async ({ request }) => {
  await ensureDatabase();

  const contentType = request.headers.get('content-type') ?? '';
  let parsedParticipant:
    | {
        courseId?: number;
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
        municipality: string;
        department: string;
        district?: string;
        organization?: string;
        roleFunction: string;
        educationLevel?: string;
        program?: string;
        status: string;
        notes?: string;
        consent: boolean;
      }
    | null = null;

  if (contentType.includes('application/json')) {
    const body = await request.json() as Record<string, unknown>;
    const pick = (camel: string, snake: string) => body[camel] ?? body[snake];
    parsedParticipant = {
      courseId: pick('courseId', 'course_id') !== undefined && pick('courseId', 'course_id') !== null ? Number(pick('courseId', 'course_id')) : undefined,
      fullName: String(pick('fullName', 'full_name') ?? ''),
      documentNumber: String(pick('documentNumber', 'document_number') ?? ''),
      birthDate: String(pick('birthDate', 'birth_date') ?? ''),
      gender: String(pick('gender', 'gender') ?? ''),
      phoneCountry: String(pick('phoneCountry', 'phone_country') ?? ''),
      phoneDialCode: String(pick('phoneDialCode', 'phone_dial_code') ?? ''),
      phoneNumber: String(pick('phoneNumber', 'phone_number') ?? ''),
      phone: String(pick('phone', 'phone') ?? ''),
      email: pick('email', 'email') ? String(pick('email', 'email')) : undefined,
      address: pick('address', 'address') ? String(pick('address', 'address')) : undefined,
      municipality: String(pick('municipality', 'municipality') ?? ''),
      department: String(pick('department', 'department') ?? ''),
      district: pick('district', 'district') ? String(pick('district', 'district')) : undefined,
      organization: pick('organization', 'organization') ? String(pick('organization', 'organization')) : undefined,
      roleFunction: String(pick('roleFunction', 'role_function') ?? ''),
      educationLevel: pick('educationLevel', 'education_level') ? String(pick('educationLevel', 'education_level')) : undefined,
      program: pick('program', 'program') ? String(pick('program', 'program')) : undefined,
      status: String(pick('status', 'status') ?? 'Pendiente'),
      notes: pick('notes', 'notes') ? String(pick('notes', 'notes')) : undefined,
      consent: Boolean(pick('consent', 'consent')),
    };
  } else {
    const formData = await request.formData();
    const validated = validateParticipantSubmission(formData, 'Pendiente');
    if (!validated.success) {
      return new Response('Datos inválidos', { status: 400 });
    }

    parsedParticipant = validated.data;
  }
  if (!parsedParticipant) {
    return new Response('Datos inválidos', { status: 400 });
  }

  const duplicates = await findParticipantDuplicates({
    documentNumber: parsedParticipant.documentNumber,
    email: parsedParticipant.email,
    phone: parsedParticipant.phone,
  });

  if (duplicates.length > 0) {
    await createNotification({
      audienceRole: 'admin',
      kind: notificationKinds.duplicateInReview,
      title: 'Duplicado en revisión',
      body: `Se detectó un posible duplicado para ${parsedParticipant.fullName}.`,
      payload: { duplicates: duplicates.map((duplicate) => duplicate.id) },
    });
  }

  const participant = await createParticipant(
    {
      courseId: parsedParticipant.courseId,
      fullName: parsedParticipant.fullName,
      documentNumber: parsedParticipant.documentNumber,
      birthDate: parsedParticipant.birthDate,
      gender: parsedParticipant.gender,
      phoneCountry: parsedParticipant.phoneCountry,
      phoneDialCode: parsedParticipant.phoneDialCode,
      phoneNumber: parsedParticipant.phoneNumber,
      phone: parsedParticipant.phone,
      email: parsedParticipant.email,
      address: parsedParticipant.address,
      municipality: parsedParticipant.municipality,
      department: parsedParticipant.department,
      district: parsedParticipant.district,
      organization: parsedParticipant.organization,
      roleFunction: parsedParticipant.roleFunction,
      educationLevel: parsedParticipant.educationLevel,
      program: parsedParticipant.program,
      status: 'Pendiente',
      notes: parsedParticipant.notes,
      consent: parsedParticipant.consent,
    },
    null,
  );

  return new Response(JSON.stringify({ data: participant }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
