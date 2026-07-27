import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@acoes.local';
const ADMIN_PASSWORD = 'Admin1234!';
// PR4 housekeeping: the seeded course id 9 used by this suite no longer
// exists in the test database (`Prueba de Colorimetría` lives at id 8 and
// `Colorimetría Profesional` at id 26). Use the seeded course name instead
// of hard-coding an id that drifts across re-seeds, and let the public link
// endpoint round-trip against whatever is currently available.
const COURSE_NAME = 'Colorimetría Profesional';

// Helper: login as admin via the SPA login flow. Returns the session cookie
// store so subsequent request.post() calls share the same auth context.
async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/#/login');
  await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL);
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /entrar/i }).click();
  await expect(page).toHaveURL(/#\/dashboard/);
}

// Look up the id of a currently-enrolling course by name. PR4 housekeeping:
// the suite no longer assumes a hard-coded numeric id because re-seeding
// shifts the sequence. Tests then assert against whatever id the database
// actually exposes today.
async function resolveCourseId(page: import('@playwright/test').Page, name: string): Promise<number> {
  const response = await page.request.get('http://localhost:4321/api/courses');
  expect(response.status(), 'GET /api/courses should succeed').toBe(200);
  const body = (await response.json()) as { data: Array<{ id: number; name: string }> };
  const match = body.data.find((c) => c.name === name);
  if (!match) throw new Error(`Seeded course "${name}" not found in /api/courses`);
  return match.id;
}

test.describe('Public enrollment link generated from the SPA', () => {
  test('admin generates a link that routes to the course detail page with the hash', async ({ page, request }) => {
    await loginAsAdmin(page);
    const courseId = await resolveCourseId(page, COURSE_NAME);

    // Ask the backend for a public link for the seeded course. Use the
    // browser's request context so the admin session cookie is forwarded.
    const response = await page.request.post(`http://localhost:4321/api/courses/${courseId}/public-link`);
    expect(response.status(), 'POST /api/courses/<id>/public-link should succeed').toBe(200);

    const body = (await response.json()) as { data: { token: string; publicUrl: string } };
    expect(body.data.token).toBeTruthy();
    expect(body.data.publicUrl).toBeTruthy();

    // Guard against regression: the URL must point to the SPA (not the
    // backend) and must include the '#' so HashRouter can route.
    expect(body.data.publicUrl).toContain(`#/cursos/${courseId}`);
    expect(body.data.publicUrl).toContain('?token=');
    expect(body.data.publicUrl).not.toContain(':4321');

    // Hit the URL as an anonymous caller (no admin cookies) so the middleware
    // redirect + HashRouter route can be exercised end-to-end.
    const nav = await request.get(body.data.publicUrl, { maxRedirects: 5 });
    expect(nav.status()).toBe(200);
    expect(nav.url()).toContain(`#/cursos/${courseId}`);
    expect(nav.url()).toContain('token=');
    expect(nav.url()).not.toContain(':4321');

    // Open the link in the browser context. The SPA should render the
    // course detail page with the course name visible.
    await page.context().clearCookies();
    await page.goto(body.data.publicUrl);
    await expect(page).toHaveURL(new RegExp(`#/cursos/${courseId}\\?token=`));
    await expect(page.getByRole('heading', { name: /colorimetr/i })).toBeVisible({ timeout: 15000 });
  });

  test('the backend-issued public link embeds the token in the search params', async ({ page }) => {
    await loginAsAdmin(page);
    const courseId = await resolveCourseId(page, COURSE_NAME);

    const response = await page.request.post(`http://localhost:4321/api/courses/${courseId}/public-link`);
    expect(response.status()).toBe(200);

    const body = (await response.json()) as { data: { token: string; publicUrl: string } };
    const parsed = new URL(body.data.publicUrl);
    expect(parsed.hash).toContain(`#/cursos/${courseId}`);
    expect(parsed.hash).toContain(`token=${body.data.token}`);
  });

  test('the backend middleware redirects a non-API path to the SPA with the hash', async ({ request }) => {
    // Hit the backend directly with a bare path that mimics a malformed
    // public link (no '#' on the request URL). The middleware should
    // 302 to the SPA with the route in the hash. Use the resolved
    // course id so the assertion stays in sync with the seed.
    const adminLogin = await request.post('http://localhost:4321/api/login', {
      headers: { 'Content-Type': 'application/json' },
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    expect(adminLogin.status()).toBe(200);
    const coursesResponse = await request.get('http://localhost:4321/api/courses');
    const coursesBody = (await coursesResponse.json()) as { data: Array<{ id: number; name: string }> };
    const courseId = coursesBody.data.find((c) => c.name === COURSE_NAME)?.id;
    expect(courseId).toBeDefined();

    const response = await request.get(`http://localhost:4321/cursos/${courseId}`, {
      maxRedirects: 0,
      failOnStatusCode: false,
    });

    expect(response.status()).toBe(302);
    const location = response.headers()['location'] ?? '';
    expect(location).toContain(`#/cursos/${courseId}`);
    expect(location).not.toContain(':4321');
  });
});
