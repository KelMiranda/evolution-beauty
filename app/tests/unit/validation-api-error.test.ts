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

describe('request() validation error envelope', () => {
  it('throws ValidationApiError with parsed issues when the backend returns 400 + validation_failed', async () => {
    const issues = [
      { path: ['gender'], message: 'Selecciona un género válido', code: 'invalid_enum_value' },
      { path: ['phoneNumber'], message: 'El número celular es obligatorio', code: 'too_small' },
    ];
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'validation_failed', issues }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { api, ValidationApiError } = await importFresh();

    let caught: unknown;
    try {
      await api.post('/api/public/participants', { gender: 'Otro' });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ValidationApiError);
    const validationErr = caught as InstanceType<typeof ValidationApiError>;
    expect(validationErr.issues).toEqual(issues);
    expect(validationErr.message).toBe('validation_failed');
  });

  it('still throws a plain Error for non-validation 4xx/5xx responses', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { api, ValidationApiError } = await importFresh();

    let caught: unknown;
    try {
      await api.get('/api/me');
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(Error);
    expect(caught).not.toBeInstanceOf(ValidationApiError);
    expect((caught as Error).message).toBe('unauthorized');
  });

  it('still throws a plain Error when the body is not JSON', async () => {
    fetchMock.mockResolvedValue(
      new Response('Bad Gateway', { status: 502, statusText: 'Bad Gateway' }),
    );

    const { api, ValidationApiError } = await importFresh();

    let caught: unknown;
    try {
      await api.get('/api/participants');
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(Error);
    expect(caught).not.toBeInstanceOf(ValidationApiError);
  });
});
