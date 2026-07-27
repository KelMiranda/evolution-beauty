export type TurnstileResult = { ok: true } | { ok: false; reason: string };

interface TurnstileVerificationResponse {
  success: boolean;
  'error-codes'?: string[];
}

/**
 * Verifies a Cloudflare Turnstile token against the siteverify endpoint.
 * Verification is skipped when the secret is not configured so local
 * development remains usable without Cloudflare credentials.
 */
export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp: string | undefined,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) {
    console.warn('[turnstile] TURNSTILE_SECRET not configured; skipping verification (dev mode)');
    return { ok: true };
  }

  if (!token) {
    return { ok: false, reason: 'Falta el token de Turnstile' };
  }

  try {
    const body = new URLSearchParams({
      secret,
      response: token,
      ...(remoteIp ? { remoteip: remoteIp } : {}),
    });
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      return { ok: false, reason: `Turnstile API error: HTTP ${response.status}` };
    }

    const result = (await response.json()) as TurnstileVerificationResponse;
    if (!result.success) {
      return {
        ok: false,
        reason: `Turnstile rejected: ${result['error-codes']?.join(', ') ?? 'unknown'}`,
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: `Turnstile verification failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
