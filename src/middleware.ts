import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const origin = context.request.headers.get('origin');

  if (!url.pathname.startsWith('/api')) {
    const reactAppUrl = import.meta.env.REACT_APP_URL || 'http://localhost:3000';
    // The SPA uses HashRouter (see app/src/main.tsx), so the route must live
    // after the '#' fragment. Prepend '#' before the path so the SPA can
    // resolve it. If the request URL already has a fragment, preserve it
    // instead of double-adding the '#' separator.
    const redirectUrl = url.hash
      ? new URL(`${url.pathname}${url.search}${url.hash}`, reactAppUrl).toString()
      : new URL(`#${url.pathname}${url.search}`, reactAppUrl).toString();
    return Response.redirect(redirectUrl, 302);
  }

  if (context.request.method === 'OPTIONS') {
    const response = new Response(null, { status: 204 });
    if (origin === 'http://localhost:3000' || origin === 'http://127.0.0.1:3000') {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, PUT, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    }
    return response;
  }

  const response = await next();

  // Allow requests from the React dev server
  if (origin === 'http://localhost:3000' || origin === 'http://127.0.0.1:3000') {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, PUT, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  }

  return response;
});
