import type { APIRoute } from 'astro';
import { z } from 'zod';

import { getCurrentUser } from '../../lib/server/auth';
import { ensureDatabase } from '../../lib/server/bootstrap';
import { canCreateParticipants, canManageParticipants } from '../../lib/server/permissions';
import { createParticipant, exportParticipantsCsv, listParticipants, countParticipants, setParticipantLifecycle, softDeleteParticipant, updateParticipant, getParticipantById } from '../../lib/server/participants';
import { exportParticipantsXlsx } from '../../lib/server/export';
import { participantSubmissionSchema } from '../../lib/server/participant-schema';

const lifecycleSchema = z.object({
  id: z.number().optional(),
  lifecycleState: z.enum(['active', 'inactive']).optional(),
  fullName: z.string().optional(),
  documentNumber: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.string().optional(),
  phoneCountry: z.string().optional(),
  phoneDialCode: z.string().optional(),
  phoneNumber: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  municipality: z.string().optional(),
  department: z.string().optional(),
  district: z.string().optional(),
  organization: z.string().optional(),
  roleFunction: z.string().optional(),
  educationLevel: z.string().optional(),
  program: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  consent: z.boolean().optional(),
});

export const GET: APIRoute = async ({ url, cookies }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!canManageParticipants(user)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const search = url.searchParams.get('q') ?? '';
  const department = url.searchParams.get('department') ?? '';
  const status = url.searchParams.get('status') ?? '';
  const lifecycleState = (url.searchParams.get('lifecycleState') ?? 'all') as 'active' | 'inactive' | 'all';
  const format = url.searchParams.get('format');
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? '50')));
  const offset = (page - 1) * limit;

  // Run the list + count in parallel. Both share the same filter set so the
  // SPA can rely on `meta.total` to render "Mostrando X de Y" pagination
  // without inferring totals from `page * limit` (which only returns the
  // current page's last index, not the actual total row count).
  const [participants, total] = await Promise.all([
    listParticipants({ search, department, status, lifecycleState, limit }),
    countParticipants({ search, department, status, lifecycleState }),
  ]);

  if (format === 'csv') {
    const csv = exportParticipantsCsv(participants);
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="acoes-participantes.csv"',
      },
    });
  }

  if (format === 'xlsx') {
    const xlsx = await exportParticipantsXlsx(participants);
    const date = new Date().toISOString().slice(0, 10);
    return new Response(new Uint8Array(xlsx), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="acoes-participantes-${date}.xlsx"`,
      },
    });
  }

  return new Response(JSON.stringify({
    data: participants,
    meta: { page, limit, offset, total },
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!canCreateParticipants(user)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parsed = participantSubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Datos inválidos', details: parsed.error.flatten() }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const participant = await createParticipant(
      {
        courseId: parsed.data.courseId,
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
        status: parsed.data.status,
        notes: parsed.data.notes,
        consent: parsed.data.consent,
      },
      user.id,
    );

    return new Response(JSON.stringify({ data: participant }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error creating participant' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const PATCH: APIRoute = async ({ request, cookies }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!canManageParticipants(user)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parsed = lifecycleSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid patch data', details: parsed.error.flatten() }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = parsed.data.id;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Participant ID required in body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Lifecycle transition
  if (parsed.data.lifecycleState) {
    const participant = await setParticipantLifecycle(id, parsed.data.lifecycleState, user.id);
    if (!participant) {
      return new Response(JSON.stringify({ error: 'Participant not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ data: participant }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Regular field update
  const existing = await getParticipantById(id);
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Participant not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.fullName !== undefined) updateData.fullName = parsed.data.fullName;
  if (parsed.data.email !== undefined) updateData.email = parsed.data.email;
  if (parsed.data.department !== undefined) updateData.department = parsed.data.department;
  if (parsed.data.roleFunction !== undefined) updateData.roleFunction = parsed.data.roleFunction;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
  if (parsed.data.organization !== undefined) updateData.organization = parsed.data.organization;
  if (parsed.data.municipality !== undefined) updateData.municipality = parsed.data.municipality;
  if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;
  if (parsed.data.documentNumber !== undefined) updateData.documentNumber = parsed.data.documentNumber;
  if (parsed.data.birthDate !== undefined) updateData.birthDate = parsed.data.birthDate;
  if (parsed.data.gender !== undefined) updateData.gender = parsed.data.gender;
  if (parsed.data.phoneCountry !== undefined) updateData.phoneCountry = parsed.data.phoneCountry;
  if (parsed.data.phoneDialCode !== undefined) updateData.phoneDialCode = parsed.data.phoneDialCode;
  if (parsed.data.phoneNumber !== undefined) updateData.phoneNumber = parsed.data.phoneNumber;
  if (parsed.data.district !== undefined) updateData.district = parsed.data.district;
  if (parsed.data.educationLevel !== undefined) updateData.educationLevel = parsed.data.educationLevel;
  if (parsed.data.program !== undefined) updateData.program = parsed.data.program;
  if (parsed.data.consent !== undefined) updateData.consent = parsed.data.consent;

  const participant = await updateParticipant(id, updateData as Parameters<typeof updateParticipant>[1], user.id);
  return new Response(JSON.stringify({ data: participant }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  await ensureDatabase();

  const user = await getCurrentUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!canManageParticipants(user)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parsed = lifecycleSchema.safeParse(body);
  if (!parsed.success || !parsed.data.id) {
    return new Response(JSON.stringify({ error: 'Participant ID required in body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = parsed.data.id;
  const participant = await softDeleteParticipant(id, user.id);
  if (!participant) {
    return new Response(JSON.stringify({ error: 'Participant not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ data: participant }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
