import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

async function importFresh() {
  vi.resetModules();
  return import('@/services/api');
}

describe('inscribir() — discriminated union (PR3 contract)', () => {
  it('returns { kind: "enrollment", data } on a 201 with { data }', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: 5,
            course_id: 9,
            participant_id: 42,
            full_name: 'Ana Test',
            email: 'ana@example.com',
            phone: '+503 7000-0000',
            dui: '12345678-9',
            fecha_inscripcion: '2024-01-01',
            estado: 'confirmed',
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const { inscribir } = await importFresh();

    const result = await inscribir({ cursoId: '9', dui: '12345678-9' }, 'tok-9-abc');

    expect(result.kind).toBe('enrollment');
    if (result.kind !== 'enrollment') throw new Error('expected enrollment kind');
    expect(result.data.id).toBe(5);
    expect(result.data.course_id).toBe(9);
    expect(result.data.participant_id).toBe(42);
    expect(result.data.full_name).toBe('Ana Test');
  });

  it('returns { kind: "redirect", redirect } on a 200 with { redirect }', async () => {
    const encoded = encodeURIComponent('/cursos/9?token=tok-9-abc');
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ redirect: `/registro?redirect=${encoded}` }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const { inscribir } = await importFresh();

    const result = await inscribir({ cursoId: '9', dui: '99999999-9' }, 'tok-9-abc');

    expect(result.kind).toBe('redirect');
    if (result.kind !== 'redirect') throw new Error('expected redirect kind');
    expect(result.redirect).toBe(`/registro?redirect=${encoded}`);
  });

  it('sends ONLY { token, dui } to POST /api/public/enrollments', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 1 } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { inscribir } = await importFresh();

    await inscribir({ cursoId: '9', dui: '12345678-9' }, 'tok-9-abc');

    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(call[0]).toBe('/api/public/enrollments');
    const options = call[1];
    expect(options.method).toBe('POST');
    expect(options.credentials).toBe('include');
    expect(JSON.parse(options.body as string)).toEqual({
      token: 'tok-9-abc',
      dui: '12345678-9',
    });
  });

  it('throws when the token is missing', async () => {
    const { inscribir } = await importFresh();

    await expect(
      inscribir({ cursoId: '9', dui: '12345678-9' }, ''),
    ).rejects.toThrow(/token/i);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('propagates backend errors on a 400 (e.g., malformed DUI)', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: 'Datos inválidos', details: { fieldErrors: { dui: ['DUI inválido'] } } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const { inscribir } = await importFresh();

    // The public-enrollments endpoint returns `error: 'Datos inválidos'`
    // (not `validation_failed`), so the error surfaces as a plain Error
    // with the backend's Spanish message intact.
    await expect(
      inscribir({ cursoId: '9', dui: '1234' }, 'tok-9-abc'),
    ).rejects.toThrow(/Datos inválidos/i);
  });

  it('propagates backend errors on a 404 (invalid token)', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'El enlace público no es válido' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { inscribir } = await importFresh();

    await expect(
      inscribir({ cursoId: '9', dui: '12345678-9' }, 'bogus-token'),
    ).rejects.toThrow(/enlace público/);
  });

  it('propagates backend errors on a 409 (course full)', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'El curso ha alcanzado su cupo máximo' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { inscribir } = await importFresh();

    await expect(
      inscribir({ cursoId: '9', dui: '12345678-9' }, 'tok-9-abc'),
    ).rejects.toThrow(/cupo máximo/);
  });

  it('prefers redirect over data when both fields are present', async () => {
    // Defensive: the contract says the backend returns either `data` or
    // `redirect`, never both. The parser should treat `redirect` as the
    // authoritative signal.
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          redirect: '/registro?redirect=%2Fcursos%2F9%3Ftoken%3Dtok-9-abc',
          data: { id: 1 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const { inscribir } = await importFresh();

    const result = await inscribir({ cursoId: '9', dui: '12345678-9' }, 'tok-9-abc');

    expect(result.kind).toBe('redirect');
  });
});