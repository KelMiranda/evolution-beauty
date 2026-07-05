import type { APIRoute } from 'astro';

import { ensureDatabase } from '../../../lib/server/bootstrap';
import { createParticipant } from '../../../lib/server/participants';
import { validateParticipantSubmission } from '../../../lib/server/participant-schema';

export const POST: APIRoute = async ({ request, redirect }) => {
  await ensureDatabase();

  const formData = await request.formData();
  const parsed = validateParticipantSubmission(formData, 'Pendiente');

  if (!parsed.success) {
    return new Response('Datos inválidos', { status: 400 });
  }

  await createParticipant(
    {
      fullName: parsed.data.fullName,
      documentNumber: parsed.data.documentNumber,
      birthDate: parsed.data.birthDate,
      gender: parsed.data.gender,
      phoneCountry: parsed.data.phoneCountry,
      phoneDialCode: parsed.data.phoneDialCode,
      phoneNumber: parsed.data.phoneNumber,
      phone: parsed.data.phone,
      email: parsed.data.email,
      address: parsed.data.address,
      municipality: parsed.data.municipality,
      department: parsed.data.department,
      district: parsed.data.district,
      organization: parsed.data.organization,
      roleFunction: parsed.data.roleFunction,
      educationLevel: parsed.data.educationLevel,
      program: parsed.data.program,
      status: 'Pendiente',
      notes: parsed.data.notes,
      consent: parsed.data.consent,
    },
    null,
  );

  return redirect('/registro?saved=1');
};
