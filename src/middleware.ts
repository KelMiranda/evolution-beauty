import { defineMiddleware } from 'astro:middleware';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ALLOWED_DEV_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);
const SPA_INDEX = fileURLToPath(new URL('../client/index.html', import.meta.url));

function applyCorsHeaders(response: Response, request: Request): Response {
  const origin = request.headers.get('origin');

  if (origin && ALLOWED_DEV_ORIGINS.has(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, PUT, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  }

  return response;
}

function handleCorsPreflight(request: Request): Response {
  return applyCorsHeaders(new Response(null, { status: 204 }), request);
}

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const isApiRequest = url.pathname.startsWith('/api');

  if (isApiRequest && context.request.method === 'OPTIONS') {
    return handleCorsPreflight(context.request);
  }

  if (isApiRequest) {
    return applyCorsHeaders(await next(), context.request);
  }

  if (context.request.method !== 'GET') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'GET' },
    });
  }

  const response = await next();
  if (response.status !== 404) {
    return response;
  }

  try {
    const html = await readFile(SPA_INDEX, 'utf-8');
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch {
    return response;
  }
});
