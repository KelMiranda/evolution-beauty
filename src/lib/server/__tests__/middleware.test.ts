import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('astro:middleware', () => ({
  defineMiddleware: <T>(fn: T) => fn,
}));

import { onRequest } from '../../../middleware';

type MiddlewareContext = Parameters<typeof onRequest>[0];
type NextFn = Parameters<typeof onRequest>[1];

function makeContext(url: string, init: { method?: string; origin?: string | null } = {}): MiddlewareContext {
  return {
    request: new Request(url, {
      method: init.method ?? 'GET',
      headers: init.origin ? { origin: init.origin } : {},
    }),
  } as unknown as MiddlewareContext;
}

function makeNext(impl: NextFn = (async () => new Response('ok')) as NextFn): NextFn {
  return vi.fn(impl) as NextFn;
}

// The middleware's return type is `Response | void` (void when it falls
// through to `next()`). The test only invokes the redirect branches, so
// casting to `Response` is safe — a void return would fail the test
// assertion below.
async function invokeMiddleware(context: MiddlewareContext, next: NextFn): Promise<Response> {
  return (await onRequest(context, next)) as Response;
}

describe('Astro middleware — SPA redirect for non-API paths', () => {
  beforeEach(() => {
    // Reset env override between tests so the default (http://localhost:3000) wins.
    vi.stubEnv('REACT_APP_URL', '');
  });

  it('redirects a /cursos/9?token=abc request to the SPA with the hash and search preserved', async () => {
    const next = makeNext();
    const response = await invokeMiddleware(
      makeContext('http://localhost:4321/cursos/9?token=abc'),
      next,
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('http://localhost:3000/#/cursos/9?token=abc');
    expect(next).not.toHaveBeenCalled();
  });

  it('redirects a /cursos/9 request (no token) to the SPA with the hash added', async () => {
    const next = makeNext();
    const response = await invokeMiddleware(makeContext('http://localhost:4321/cursos/9'), next);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('http://localhost:3000/#/cursos/9');
    expect(next).not.toHaveBeenCalled();
  });

  it('redirects the root path / to the SPA root with the hash containing the path', async () => {
    const next = makeNext();
    const response = await invokeMiddleware(makeContext('http://localhost:4321/'), next);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('http://localhost:3000/#/');
    expect(next).not.toHaveBeenCalled();
  });

  it('does not double-add the hash when the request URL already has a fragment', async () => {
    const next = makeNext();
    // Request URL with path + search + fragment: the URL spec treats everything
    // after the first '#' as the fragment, so the "path" is /cursos/9, the
    // "search" is ?token=abc, and the "hash" is #extra. The middleware must
    // forward the URL as-is to the SPA without injecting a second '#'.
    const response = await invokeMiddleware(
      makeContext('http://localhost:4321/cursos/9?token=abc#extra'),
      next,
    );

    expect(response.status).toBe(302);
    const location = response.headers.get('location') ?? '';
    expect(location).toBe('http://localhost:3000/cursos/9?token=abc#extra');
    expect(next).not.toHaveBeenCalled();
  });

  it('passes through a URL whose hash is already in SPA route form', async () => {
    const next = makeNext();
    const response = await invokeMiddleware(
      makeContext('http://localhost:4321/#/cursos/9?token=abc'),
      next,
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('http://localhost:3000/#/cursos/9?token=abc');
    expect(next).not.toHaveBeenCalled();
  });

  it('uses REACT_APP_URL when set instead of the default localhost origin', async () => {
    vi.stubEnv('REACT_APP_URL', 'https://cursos.example.com');
    const next = makeNext();
    const response = await invokeMiddleware(makeContext('http://localhost:4321/cursos/9'), next);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://cursos.example.com/#/cursos/9');
  });

  it('does NOT redirect /api paths and forwards them to next()', async () => {
    const next = makeNext();
    const response = await invokeMiddleware(makeContext('http://localhost:4321/api/courses'), next);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('ok');
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('Astro middleware — CORS for the React dev server', () => {
  beforeEach(() => {
    vi.stubEnv('REACT_APP_URL', '');
  });

  it('responds to OPTIONS preflight from the SPA origin with CORS headers', async () => {
    const next = makeNext();
    const response = await invokeMiddleware(
      makeContext('http://localhost:4321/api/courses', { method: 'OPTIONS', origin: 'http://localhost:3000' }),
      next,
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    expect(next).not.toHaveBeenCalled();
  });

  it('does not set CORS allow-origin on OPTIONS from a non-SPA origin', async () => {
    const next = makeNext();
    const response = await invokeMiddleware(
      makeContext('http://localhost:4321/api/courses', { method: 'OPTIONS', origin: 'https://evil.example.com' }),
      next,
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('adds CORS headers to the downstream response when the SPA origin sent the request', async () => {
    const next = makeNext(async () => new Response('ok'));
    const response = await invokeMiddleware(
      makeContext('http://localhost:4321/api/courses', { origin: 'http://localhost:3000' }),
      next,
    );

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });

  it('does not add CORS headers when the origin is missing or unknown', async () => {
    const next = makeNext(async () => new Response('ok'));
    const response = await invokeMiddleware(makeContext('http://localhost:4321/api/courses'), next);

    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});
