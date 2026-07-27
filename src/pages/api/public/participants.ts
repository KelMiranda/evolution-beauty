import type { APIRoute } from 'astro';

import { ensureDatabase } from '../../../lib/server/bootstrap';
import { pickBoolean, pickNumber, pickOptionalString, pickString } from '../../../lib/server/http-picks';
import { createNotification, notificationKinds } from '../../../lib/server/notifications';
import { validateParticipantSubmission } from '../../../lib/server/participant-schema';
import { createParticipant, findParticipantDuplicates } from '../../../lib/server/participants';
import { publicParticipantSubmissionSchema } from '../../../lib/server/public-participant-schema';
import { verifyTurnstileToken } from '../../../lib/server/turnstile';

export const POST: APIRoute = async ({ request }) => {
  await ensureDatabase();

  const contentType = request.headers.get('content-type') ?? '';
  let turnstileToken: string | undefined;
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
    const raw = (await request.json()) as Record<string, unknown>;
    turnstileToken = typeof raw.turnstileToken === 'string' ? raw.turnstileToken : undefined;
    const normalized = {
      courseId: pickNumber(raw, 'courseId', 'course_id'),
      fullName: pickString(raw, 'fullName', 'full_name'),
      documentNumber: pickString(raw, 'documentNumber', 'document_number'),
      birthDate: pickString(raw, 'birthDate', 'birth_date'),
      gender: pickString(raw, 'gender', 'gender'),
      phoneCountry: pickString(raw, 'phoneCountry', 'phone_country'),
      phoneDialCode: pickString(raw, 'phoneDialCode', 'phone_dial_code'),
      phoneNumber: pickString(raw, 'phoneNumber', 'phone_number'),
      phone: pickString(raw, 'phone', 'phone'),
      email: pickOptionalString(raw, 'email', 'email'),
      address: pickOptionalString(raw, 'address', 'address'),
      municipality: pickString(raw, 'municipality', 'municipality'),
      department: pickString(raw, 'department', 'department'),
      district: pickOptionalString(raw, 'district', 'district'),
      organization: pickOptionalString(raw, 'organization', 'organization'),
      roleFunction: pickString(raw, 'roleFunction', 'role_function'),
      educationLevel: pickOptionalString(raw, 'educationLevel', 'education_level'),
      program: pickOptionalString(raw, 'program', 'program'),
      status: pickString(raw, 'status', 'status') || 'Pendiente',
      notes: pickOptionalString(raw, 'notes', 'notes'),
      consent: pickBoolean(raw, 'consent', 'consent'),
    };
    const parsed = publicParticipantSubmissionSchema.safeParse(normalized);
    if (!parsed.success) {
      return Response.json(
        { error: 'validation_failed', issues: parsed.error.issues },
        { status: 400 },
      );
    }
    parsedParticipant = parsed.data;
  } else {
    const formData = await request.formData();
    const formTurnstileToken = formData.get('cf-turnstile-response');
    turnstileToken = typeof formTurnstileToken === 'string' ? formTurnstileToken : undefined;
    const validated = validateParticipantSubmission(formData, 'Pendiente');
    if (!validated.success) {
      return new Response('Datos inválidos', { status: 400 });
    }

    parsedParticipant = validated.data;
  }
  if (!parsedParticipant) {
    return new Response('Datos inválidos', { status: 400 });
  }

  const forwardedIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const remoteIp = request.headers.get('cf-connecting-ip') ?? forwardedIp;
  const turnstile = await verifyTurnstileToken(turnstileToken, remoteIp);
  if (!turnstile.ok) {
    return Response.json(
      { error: 'turnstile_failed', message: turnstile.reason },
      { status: 400 },
    );
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
      // Public submissions MUST NOT persist notes; the public schema
      // discards any incoming value to undefined. Pass undefined here
      // explicitly so the create input is unambiguous.
      notes: undefined,
      consent: parsedParticipant.consent,
    },
    null,
  );

  return new Response(JSON.stringify({ data: participant }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
