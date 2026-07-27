import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { verifyTurnstileToken } from '../turnstile';

describe('verifyTurnstileToken', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    delete process.env.TURNSTILE_SECRET;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.TURNSTILE_SECRET;
  });

  it('skips verification when the secret is not configured', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(verifyTurnstileToken(undefined, undefined)).resolves.toEqual({ ok: true });
    expect(warning).toHaveBeenCalledWith(
      '[turnstile] TURNSTILE_SECRET not configured; skipping verification (dev mode)',
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects a missing token when the secret is configured', async () => {
    process.env.TURNSTILE_SECRET = 'secret';

    await expect(verifyTurnstileToken(undefined, undefined)).resolves.toEqual({
      ok: false,
      reason: 'Falta el token de Turnstile',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('accepts a successful verification response', async () => {
    process.env.TURNSTILE_SECRET = 'secret';
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));

    await expect(verifyTurnstileToken('token', '203.0.113.1')).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({ method: 'POST' }),
    );
    const request = vi.mocked(fetch).mock.calls[0]?.[1];
    expect(String(request?.body)).toContain('remoteip=203.0.113.1');
  });

  it('rejects a failed verification response', async () => {
    process.env.TURNSTILE_SECRET = 'secret';
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }), { status: 200 }),
    );

    await expect(verifyTurnstileToken('bad-token', undefined)).resolves.toEqual({
      ok: false,
      reason: 'Turnstile rejected: invalid-input-response',
    });
  });

  it('rejects when the verification request fails', async () => {
    process.env.TURNSTILE_SECRET = 'secret';
    vi.mocked(fetch).mockRejectedValue(new Error('network unavailable'));

    await expect(verifyTurnstileToken('token', undefined)).resolves.toEqual({
      ok: false,
      reason: 'Turnstile verification failed: network unavailable',
    });
  });
});
