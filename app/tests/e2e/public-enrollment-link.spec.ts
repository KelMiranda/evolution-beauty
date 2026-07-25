import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@acoes.local';
const ADMIN_PASSWORD = 'Admin1234!';
const COURSE_ID = 9;

// Helper: login as admin via the SPA login flow. Returns the session cookie
// store so subsequent request.post() calls share the same auth context.
async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/#/login');
  await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL);
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /entrar/i }).click();
  await expect(page).toHaveURL(/#\/dashboard/);
}

test.describe('Public enrollment link generated from the SPA', () => {
  test('admin generates a link that routes to the course detail page with the hash', async ({ page, request }) => {
    await loginAsAdmin(page);

    // Ask the backend for a public link for the seeded course. Use the
    // browser's request context so the admin session cookie is forwarded.
    const response = await page.request.post(`http://localhost:4321/api/courses/${COURSE_ID}/public-link`);
    expect(response.status(), 'POST /api/courses/<id>/public-link should succeed').toBe(200);

    const body = (await response.json()) as { data: { token: string; publicUrl: string } };
    expect(body.data.token).toBeTruthy();
    expect(body.data.publicUrl).toBeTruthy();

    // Guard against regression: the URL must point to the SPA (not the
    // backend) and must include the '#' so HashRouter can route.
    expect(body.data.publicUrl).toContain('#/cursos/9');
    expect(body.data.publicUrl).toContain('?token=');
    expect(body.data.publicUrl).not.toContain(':4321');

    // Hit the URL as an anonymous caller (no admin cookies) so the middleware
    // redirect + HashRouter route can be exercised end-to-end.
    const nav = await request.get(body.data.publicUrl, { maxRedirects: 5 });
    expect(nav.status()).toBe(200);
    expect(nav.url()).toContain('#/cursos/9');
    expect(nav.url()).toContain('token=');
    expect(nav.url()).not.toContain(':4321');

    // Open the link in the browser context. The SPA should render the
    // course detail page with the course name visible.
    await page.context().clearCookies();
    await page.goto(body.data.publicUrl);
    await expect(page).toHaveURL(/#\/cursos\/9\?token=/);
    await expect(page.getByRole('heading', { name: /colorimetr/i })).toBeVisible({ timeout: 15000 });
  });

  test('the backend-issued public link embeds the token in the search params', async ({ page }) => {
    await loginAsAdmin(page);

    const response = await page.request.post(`http://localhost:4321/api/courses/${COURSE_ID}/public-link`);
    expect(response.status()).toBe(200);

    const body = (await response.json()) as { data: { token: string; publicUrl: string } };
    const parsed = new URL(body.data.publicUrl);
    expect(parsed.hash).toContain('#/cursos/9');
    expect(parsed.hash).toContain(`token=${body.data.token}`);
  });

  test('the backend middleware redirects a non-API path to the SPA with the hash', async ({ request }) => {
    // Hit the backend directly with a bare path that mimics a malformed
    // public link (no '#' on the request URL). The middleware should
    // 302 to the SPA with the route in the hash.
    const response = await request.get('http://localhost:4321/cursos/9', {
      maxRedirects: 0,
      failOnStatusCode: false,
    });

    expect(response.status()).toBe(302);
    const location = response.headers()['location'] ?? '';
    expect(location).toContain('#/cursos/9');
    expect(location).not.toContain(':4321');
  });
});
