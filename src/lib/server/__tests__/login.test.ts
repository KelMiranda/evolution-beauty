import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  loginUserMock,
  createSessionMock,
  verifyTurnstileTokenMock,
} = vi.hoisted(() => ({
  loginUserMock: vi.fn(),
  createSessionMock: vi.fn(),
  verifyTurnstileTokenMock: vi.fn(),
}));

vi.mock('../auth', () => ({
  loginUser: loginUserMock,
  createSession: createSessionMock,
}));
vi.mock('../turnstile', () => ({ verifyTurnstileToken: verifyTurnstileTokenMock }));

import { POST } from '../../../pages/api/login';

const baseCookies = {} as Parameters<typeof POST>[0]['cookies'];

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('POST /api/login', () => {
  beforeEach(() => {
    loginUserMock.mockReset();
    createSessionMock.mockReset();
    verifyTurnstileTokenMock.mockReset().mockResolvedValue({ ok: true });
  });

  it('returns 401 with invalid JSON', async () => {
    const request = new Request('http://localhost/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });

    const response = await POST({ request, cookies: baseCookies } as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);
    expect(loginUserMock).not.toHaveBeenCalled();
    expect(verifyTurnstileTokenMock).not.toHaveBeenCalled();
  });

  it('returns 401 when the payload fails Zod validation', async () => {
    const response = await POST({
      request: makeRequest({ email: 'not-an-email', password: '' }),
      cookies: baseCookies,
    } as Parameters<typeof POST>[0]);
    expect(response.status).toBe(401);
    expect(loginUserMock).not.toHaveBeenCalled();
    expect(verifyTurnstileTokenMock).not.toHaveBeenCalled();
  });

  it('returns 400 turnstile_failed when Turnstile verification rejects the token', async () => {
    verifyTurnstileTokenMock.mockResolvedValue({ ok: false, reason: 'Falta el token de Turnstile' });

    const response = await POST({
      request: makeRequest({ email: 'admin@acoes.local', password: 'Admin1234!', turnstileToken: '' }),
      cookies: baseCookies,
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'turnstile_failed',
      message: 'Falta el token de Turnstile',
    });
    expect(loginUserMock).not.toHaveBeenCalled();
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it('passes the JSON turnstileToken and Cloudflare client IP to verification', async () => {
    loginUserMock.mockResolvedValue({
      id: 1,
      email: 'admin@acoes.local',
      full_name: 'Admin',
      role: 'admin',
      active: true,
    });
    verifyTurnstileTokenMock.mockResolvedValue({ ok: true });

    const response = await POST({
      request: makeRequest(
        { email: 'admin@acoes.local', password: 'Admin1234!', turnstileToken: 'verified-token' },
        { 'cf-connecting-ip': '203.0.113.42' },
      ),
      cookies: baseCookies,
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(verifyTurnstileTokenMock).toHaveBeenCalledWith('verified-token', '203.0.113.42');
  });

  it('falls back to the first x-forwarded-for entry when cf-connecting-ip is absent', async () => {
    loginUserMock.mockResolvedValue({
      id: 1,
      email: 'admin@acoes.local',
      full_name: 'Admin',
      role: 'admin',
      active: true,
    });
    verifyTurnstileTokenMock.mockResolvedValue({ ok: true });

    const response = await POST({
      request: makeRequest(
        { email: 'admin@acoes.local', password: 'Admin1234!', turnstileToken: 'token' },
        { 'x-forwarded-for': '198.51.100.7, 10.0.0.1' },
      ),
      cookies: baseCookies,
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(verifyTurnstileTokenMock).toHaveBeenCalledWith('token', '198.51.100.7');
  });

  it('passes undefined remoteIp when neither Cloudflare nor x-forwarded-for headers are present', async () => {
    loginUserMock.mockResolvedValue({
      id: 1,
      email: 'admin@acoes.local',
      full_name: 'Admin',
      role: 'admin',
      active: true,
    });
    verifyTurnstileTokenMock.mockResolvedValue({ ok: true });

    const response = await POST({
      request: makeRequest({ email: 'admin@acoes.local', password: 'Admin1234!', turnstileToken: 'token' }),
      cookies: baseCookies,
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(verifyTurnstileTokenMock).toHaveBeenCalledWith('token', undefined);
  });

  it('returns 200 and redirects participante-role users to /registro', async () => {
    loginUserMock.mockResolvedValue({
      id: 7,
      email: 'participante@example.com',
      full_name: 'Participante Test',
      role: 'participante',
      active: true,
    });

    const response = await POST({
      request: makeRequest({ email: 'participante@example.com', password: 'pw', turnstileToken: 't' }),
      cookies: baseCookies,
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    const body = (await response.json()) as { user: unknown; redirectTo: string };
    expect(body.redirectTo).toBe('/registro');
    expect(createSessionMock).toHaveBeenCalledWith(7, baseCookies);
  });

  it('returns 200 and redirects facilitador-role users to /dashboard/participantes/nuevo', async () => {
    loginUserMock.mockResolvedValue({
      id: 9,
      email: 'facilitador@example.com',
      full_name: 'Facilitador Test',
      role: 'facilitador',
      active: true,
    });

    const response = await POST({
      request: makeRequest({ email: 'facilitador@example.com', password: 'pw', turnstileToken: 't' }),
      cookies: baseCookies,
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    const body = (await response.json()) as { redirectTo: string };
    expect(body.redirectTo).toBe('/dashboard/participantes/nuevo');
  });

  it('returns 401 when loginUser rejects the credentials', async () => {
    loginUserMock.mockResolvedValue(null);

    const response = await POST({
      request: makeRequest({ email: 'admin@acoes.local', password: 'wrong', turnstileToken: 't' }),
      cookies: baseCookies,
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(401);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/contrase[ñn]a/i);
    expect(createSessionMock).not.toHaveBeenCalled();
  });
});