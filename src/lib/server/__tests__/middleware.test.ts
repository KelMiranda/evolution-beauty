import { beforeEach, describe, expect, it, vi } from 'vitest';

const { readFileMock } = vi.hoisted(() => ({
  readFileMock: vi.fn(),
}));

vi.mock('astro:middleware', () => ({
  defineMiddleware: <T>(fn: T) => fn,
}));
vi.mock('node:fs/promises', () => ({
  readFile: readFileMock,
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

async function invokeMiddleware(context: MiddlewareContext, next: NextFn): Promise<Response> {
  return (await onRequest(context, next)) as Response;
}

describe('Astro middleware — SPA serving for non-API paths', () => {
  beforeEach(() => {
    readFileMock.mockReset();
    readFileMock.mockResolvedValue('<html><div id="root"></div></html>');
  });

  it('serves the SPA index when Astro returns 404 for a GET request', async () => {
    const next = makeNext(async () => new Response('Not Found', { status: 404 }));
    const response = await invokeMiddleware(
      makeContext('http://localhost:4321/cursos/9?token=abc'),
      next,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(await response.text()).toContain('id="root"');
    expect(next).toHaveBeenCalledTimes(1);
    expect(readFileMock).toHaveBeenCalledTimes(1);
  });

  it('returns Astro static-file responses without reading the SPA index', async () => {
    const next = makeNext(async () => new Response('bundle', {
      headers: { 'Content-Type': 'text/javascript' },
    }));
    const response = await invokeMiddleware(
      makeContext('http://localhost:4321/assets/index.js'),
      next,
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('bundle');
    expect(readFileMock).not.toHaveBeenCalled();
  });

  it('preserves Astro 404 when the SPA index is unavailable', async () => {
    readFileMock.mockRejectedValue(new Error('index missing'));
    const next = makeNext(async () => new Response('Not Found', { status: 404 }));
    const response = await invokeMiddleware(makeContext('http://localhost:4321/missing'), next);

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('Not Found');
  });

  it('returns 405 for non-GET requests outside the API', async () => {
    const next = makeNext();
    const response = await invokeMiddleware(
      makeContext('http://localhost:4321/cursos/9', { method: 'DELETE' }),
      next,
    );

    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET');
    expect(next).not.toHaveBeenCalled();
  });

  it('passes API requests through to Astro', async () => {
    const next = makeNext();
    const response = await invokeMiddleware(makeContext('http://localhost:4321/api/courses'), next);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('ok');
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('Astro middleware — CORS for the React dev server', () => {
  it('responds to API preflight from an allowed development origin', async () => {
    const next = makeNext();
    const response = await invokeMiddleware(
      makeContext('http://localhost:4321/api/courses', {
        method: 'OPTIONS',
        origin: 'http://localhost:3000',
      }),
      next,
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    expect(next).not.toHaveBeenCalled();
  });

  it('does not allow an unknown origin on API preflight', async () => {
    const response = await invokeMiddleware(
      makeContext('http://localhost:4321/api/courses', {
        method: 'OPTIONS',
        origin: 'https://evil.example.com',
      }),
      makeNext(),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('adds CORS headers to API responses for an allowed development origin', async () => {
    const response = await invokeMiddleware(
      makeContext('http://localhost:4321/api/courses', { origin: 'http://127.0.0.1:3000' }),
      makeNext(async () => new Response('ok')),
    );

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://127.0.0.1:3000');
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });

  it('does not add CORS headers when the origin is missing or unknown', async () => {
    const response = await invokeMiddleware(
      makeContext('http://localhost:4321/api/courses'),
      makeNext(async () => new Response('ok')),
    );

    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});
