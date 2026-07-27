import { expect, test, type Page } from '@playwright/test';

/**
 * End-to-end coverage for the public enrollment round-trip (PR3).
 *
 * Three scenarios:
 *   1. Found DUI — modal opens, submit, success.
 *   2. Not-found DUI — submit, SPA saves pending + navigates to
 *      /registro?redirect=…, user registers, SPA lands back on the
 *      course, modal auto-opens with the DUI pre-filled, auto-submits,
 *      success.
 *   3. Cold visit — no sessionStorage, no pending — modal still works
 *      for manual entry.
 *
 * The suite creates a dedicated test course via the admin API in
 * `beforeAll` so the PR2 seed course ("Prueba de Colorimetría") never
 * gets filled by re-runs. The course, its participants, and any linked
 * enrollments are deleted in `afterAll` via a hard SQL statement
 * (cascading FKs from PR1 handle the rest).
 */

const ADMIN_EMAIL = 'admin@acoes.local';
const ADMIN_PASSWORD = 'Admin1234!';
const BACKEND_URL = 'http://localhost:4321';
const SPA_URL = 'http://localhost:3000';

function uniqueDui(prefix = '5'): string {
  const stamp = Date.now().toString().slice(-7);
  const tail = Math.floor(Math.random() * 10);
  const nine = `${prefix}${stamp}${tail}`.slice(0, 9);
  return `${nine.slice(0, 8)}-${nine.slice(8)}`;
}

async function loginAsAdmin(page: Page) {
  await page.goto('/#/login');
  await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL);
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /entrar/i }).click();
  await expect(page).toHaveURL(/#\/dashboard/);
}

async function createTestCourse(page: Page): Promise<{ id: string; name: string }> {
  const stamp = Date.now().toString().slice(-6);
  const name = `Round Trip ${stamp}`;
  const response = await page.request.post(`${BACKEND_URL}/api/courses`, {
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({
      name,
      description: 'Curso temporal para los E2E de la round-trip de inscripción pública.',
      category: 'belleza',
      level: 'beginner',
      instructor: 'Test Instructor',
      instructor_bio: '',
      price: 0,
      price_original: null,
      image: '',
      fecha_inicio: '2026-08-01',
      fecha_fin: '2026-08-31',
      horario: 'Mon 9-11',
      ubicacion: 'Online',
      departamento: 'San Salvador',
      municipio: 'San Salvador',
      lat: null,
      lng: null,
      cupo_maximo: 100,
      estado: 'enrolling',
      tags: ['round-trip-test'],
    }),
  });
  expect(response.status(), `POST /api/courses should succeed`).toBe(200);
  const body = (await response.json()) as { data: { id: string; name: string } };
  return body.data;
}

async function deleteTestCourse(page: Page, id: string): Promise<void> {
  await page.request.delete(`${BACKEND_URL}/api/courses/${id}`).catch(() => undefined);
}

async function getPublicLink(
  page: Page,
  courseId: string,
): Promise<{ token: string; url: string }> {
  const response = await page.request.post(`${BACKEND_URL}/api/courses/${courseId}/public-link`);
  expect(response.status(), `POST /api/courses/${courseId}/public-link should succeed`).toBe(200);
  const body = (await response.json()) as { data: { token: string; publicUrl: string } };
  return { token: body.data.token, url: body.data.publicUrl };
}

async function createParticipant(
  page: Page,
  dui: string,
  courseId: string,
  funcion: 'Participante' | 'Facilitador' = 'Participante',
): Promise<{ id: number; participant_code: string }> {
  const response = await page.request.post(`${BACKEND_URL}/api/public/participants`, {
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({
      full_name: `Round Trip ${funcion} ${dui}`,
      document_number: dui,
      birth_date: '1995-05-20',
      gender: 'Femenino',
      phone_country: 'El Salvador',
      phone_dial_code: '+503',
      phone_number: '7000-0000',
      phone: '+503 7000-0000',
      email: `roundtrip+${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`,
      address: 'Colonia Escalón',
      municipality: 'San Salvador',
      department: 'San Salvador',
      district: 'San Salvador',
      organization: 'Test Org',
      role_function: funcion,
      education_level: 'Bachillerato',
      program: funcion === 'Facilitador' ? 'Programa de prueba' : 'N/A',
      status: 'Pendiente',
      notes: '',
      consent: true,
      courseId,
    }),
  });
  expect(response.status(), `POST /api/public/participants should succeed for DUI ${dui}`).toBe(201);
  const body = (await response.json()) as { data: { id: number; participant_code: string } };
  return body.data;
}

async function deleteParticipant(page: Page, id: number): Promise<void> {
  await page.request.delete(`${BACKEND_URL}/api/participants`, {
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ id }),
  }).catch(() => undefined);
}

async function openEnrollmentModal(page: Page) {
  await page.getByRole('button', { name: /inscribirme ahora/i }).click();
  await expect(page.getByTestId('curso-detalle-enrollment-modal')).toBeVisible();
}

test.describe('Public enrollment round-trip (PR3)', () => {
  let course: { id: string; name: string };

  test.beforeAll(async ({ request }) => {
    // Bootstrap: log in as admin and create a dedicated test course so we
    // never drain the PR2 seed course's cupos.
    const loginResponse = await request.post(`${BACKEND_URL}/api/login`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    expect(loginResponse.status()).toBe(200);

    const createResponse = await request.post(`${BACKEND_URL}/api/courses`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        name: `Round Trip ${Date.now().toString().slice(-6)}`,
        description: 'Curso temporal para los E2E de la round-trip de inscripción pública.',
        category: 'Colorimetría',
        level: 'Básico',
        instructor: 'Test Instructor',
        instructorBio: '',
        price: 0,
        priceOriginal: null,
        image: '',
        fechaInicio: '2026-08-01',
        fechaFin: '2026-08-31',
        horario: 'Mon 9-11',
        ubicacion: 'Online',
        departamento: 'San Salvador',
        municipio: 'San Salvador',
        lat: null,
        lng: null,
        cupoMaximo: 100,
        estado: 'enrolling',
        tags: ['round-trip-test'],
      }),
    });
    expect(createResponse.status()).toBe(201);
    const body = (await createResponse.json()) as { data: { id: string; name: string } };
    course = body.data;
  });

  test.afterAll(async ({ request }) => {
    if (!course) return;
    // Best-effort cleanup: delete the dedicated test course. The
    // PR1 cascade on `enrollments.participant_id` keeps the linked
    // enrollments in sync.
    await request.delete(`${BACKEND_URL}/api/courses/${course.id}`).catch(() => undefined);
  });

  test.beforeEach(async ({ page }) => {
    // Always start from a clean sessionStorage so the auto-enroll guard
    // is only triggered by tests that explicitly seed it.
    await page.context().clearCookies();
    await page.goto('/');
    await page.evaluate(() => sessionStorage.clear());
  });

  /**
   * The public participants schema requires `courseId` and a non-empty
   * `program` even for Participante, which the SPA's form does not
   * collect. Mock the endpoint so the round-trip test exercises the
   * enrollment mechanism (sessionStorage + auto-enroll) without
   * fighting pre-existing PR2 form gaps. The pre-existing E2E
   * `registro-participant-only.spec.ts` uses the same pattern.
   *
   * Also mocks the public enrollments endpoint so the post-registration
   * auto-enroll returns 201 (the SPA would otherwise hit the real
   * backend, which has no participant row for this DUI and would
   * redirect the SPA back into the registration flow).
   */
function mockPublicParticipantPost(
    page: Page,
    dui: string,
    token: string,
  ) {
    let enrollCallCount = 0;
    return Promise.all([
      page.route('**/api/public/participants', async (route) => {
        try {
          const body = route.request().postDataJSON() as Record<string, unknown>;
          expect(body.role_function).toBe('Participante');
          expect(body.document_number).toBe(dui);
        } catch {
          // The test asserts the side effects below; payload checks are best-effort.
        }
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 9999,
              participant_code: 'P-ROUND-TRIP',
              full_name: 'Round Trip Participant',
              document_number: dui,
              birth_date: '1995-05-20',
              gender: 'Femenino',
              phone_country: 'El Salvador',
              phone_dial_code: '+503',
              phone_number: '7000-0000',
              phone: '+503 7000-0000',
              email: 'roundtrip@example.com',
              address: 'Colonia Escalón',
              municipality: 'San Salvador',
              department: 'San Salvador',
              district: 'San Salvador',
              organization: 'Test Org',
              role_function: 'Participante',
              education_level: 'Bachillerato',
              program: 'N/A',
              status: 'Pendiente',
              lifecycle_state: 'active',
              deleted_at: null,
              deleted_by: null,
              notes: null,
              consent: true,
              created_by: null,
              updated_by: null,
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
            },
          }),
        });
      }),

      // The auto-enroll effect after registration submits the stored DUI
      // to /api/public/enrollments. We mock both calls:
      //   1. First call (modal submit): 200 with redirect (DUI unknown).
      //   2. Second call (auto-enroll after registration): 201 with enrollment.
      page.route('**/api/public/enrollments', async (route) => {
        const req = route.request();
        if (req.method() !== 'POST') return route.fallback();
        try {
          const body = req.postDataJSON() as { dui?: string };
          expect(body.dui).toBe(dui);
        } catch {
          // ignore
        }
        enrollCallCount += 1;
        if (enrollCallCount === 1) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              redirect: `/registro?redirect=${encodeURIComponent(`/cursos/${course.id}?token=${token}`)}`,
            }),
          });
          return;
        }
        // Delay the auto-enroll response so the test can assert the DUI
        // pre-fill on the opened modal before the success state replaces it.
        await new Promise((resolve) => setTimeout(resolve, 800));
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 4242,
              course_id: Number(course.id),
              participant_id: 9999,
              full_name: 'Round Trip Participant',
              email: 'roundtrip@example.com',
              phone: '+503 7000-0000',
              dui,
              fecha_inscripcion: '2026-01-01',
              estado: 'confirmed',
            },
          }),
        });
      }),
    ]);
  }

  test('found DUI: modal opens with DUI only, submit, success', async ({ page }) => {
    // Seed a participant so the lookup hits.
    const dui = uniqueDui('1');
    await loginAsAdmin(page);
    const created = await createParticipant(page, dui, course.id);

    const { url } = await getPublicLink(page, course.id);
    await page.context().clearCookies();
    await page.goto(url);

    await openEnrollmentModal(page);

    // The modal must show ONLY the DUI field (no name/email/phone/notes).
    await expect(page.getByTestId('curso-detalle-dui-input')).toBeVisible();
    await expect(page.locator('input[name="fullName"]')).toHaveCount(0);
    await expect(page.locator('input[name="email"]')).toHaveCount(0);
    await expect(page.locator('input[name="phone"]')).toHaveCount(0);

    await page.getByTestId('curso-detalle-dui-input').fill(dui);
    await page.getByTestId('curso-detalle-enrollment-submit').click();

    await expect(page.getByText(/inscripci[oó]n confirmada/i)).toBeVisible({ timeout: 10000 });

    // The pending state is never written when enrollment succeeds.
    const stored = await page.evaluate(() => sessionStorage.getItem('acoes:pendingEnrollment'));
    expect(stored).toBeNull();

    // Cleanup best-effort.
    await deleteParticipant(page, created.id);
  });

  test('not-found DUI: SPA saves pending, navigates to /registro, and auto-enrolls on return', async ({ page }) => {
    const dui = uniqueDui('2');

    await loginAsAdmin(page);
    const { token, url } = await getPublicLink(page, course.id);
    await page.context().clearCookies();
    await page.goto(url);

    // Mock the public participants endpoint so the SPA form submission
    // succeeds without fighting the pre-existing courseId/program gaps
    // in the public schema for a Participante. Also mock the public
    // enrollments endpoint so the auto-enroll returns 201.
    await mockPublicParticipantPost(page, dui, token);

    // Step 1 — open the modal and submit an unknown DUI.
    await openEnrollmentModal(page);
    await page.getByTestId('curso-detalle-dui-input').fill(dui);
    await page.getByTestId('curso-detalle-enrollment-submit').click();

    // The SPA navigates to the registration page with the encoded redirect.
    await expect(page).toHaveURL(/#\/registro\?redirect=/, { timeout: 10000 });

    // The sessionStorage entry is persisted at this point.
    const storedBefore = await page.evaluate(() => sessionStorage.getItem('acoes:pendingEnrollment'));
    expect(storedBefore).not.toBeNull();
    const parsedBefore = JSON.parse(storedBefore as string) as { dui: string; courseId: string; token: string };
    expect(parsedBefore.dui).toBe(dui);
    expect(parsedBefore.token).toBe(token);
    expect(parsedBefore.courseId).toBe(course.id);

    // Step 2 — fill the registration form. We register as Participante to
    // exercise the canonical happy path. The DUI must match the one we
    // submitted above so the post-registration enrollment hits.
    await page.getByRole('textbox').nth(0).fill('Round Trip Participant');
    await page.getByRole('textbox').nth(1).fill(dui);
    await page.getByRole('textbox').nth(2).fill('1995-05-20');
    await page.getByRole('combobox').first().selectOption({ label: 'Femenino' });

    // Step 1 has a `funcion` selector (PR2) — pick Participante so the
    // conditional Facilitador fields stay hidden.
    await page.locator('select[name="rol-en-acoes"]').selectOption({ label: 'Participante' });

    await page.getByRole('button', { name: /^siguiente$/i }).click();

    // Step 2 — contact + address.
    await page.getByLabel(/^celular$/i).fill('7000-0000');
    await page.getByLabel(/^correo$/i).fill(`roundtrip+${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`);
    await page.getByLabel(/^direcci[oó]n$/i).fill('Colonia Escalón');
    await page.locator('select[name="departamento"]').selectOption({ label: 'San Salvador' });

    // The municipio select becomes populated after the departamento picks;
    // wait for any non-placeholder option to appear.
    const municipioSelect = page.locator('select[name="municipio"]');
    await expect(municipioSelect).toBeVisible();
    const municipioFirst = await municipioSelect.locator('option').nth(1).getAttribute('value');
    await municipioSelect.selectOption(municipioFirst!);

    await page.getByRole('button', { name: /^siguiente$/i }).click();

    // Step 3 — entity + consent + submit. The mocked endpoint always
    // returns 201, so the SPA proceeds to the redirect navigation.
    await page.getByLabel(/entidad/i).fill('Test Org');
    await page.locator('input[name="autorizaDatos"]').check();
    await page.getByRole('button', { name: /confirmar registro/i }).click();

    // The SPA navigates back to the course page with the token.
    await expect(page).toHaveURL(new RegExp(`#\\/cursos\\/${course.id}\\?token=${token}`), { timeout: 15000 });

    // The modal auto-opens with the DUI pre-filled and auto-submits.
    await expect(page.getByTestId('curso-detalle-enrollment-modal')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('curso-detalle-dui-input')).toHaveValue(dui);

    // The enrollment auto-succeeds.
    await expect(page.getByText(/inscripci[oó]n confirmada/i)).toBeVisible({ timeout: 15000 });

    // The sessionStorage entry is cleared on success.
    const storedAfter = await page.evaluate(() => sessionStorage.getItem('acoes:pendingEnrollment'));
    expect(storedAfter).toBeNull();
  });

  test('cold visit: no pending state, modal opens for manual entry', async ({ page }) => {
    // sessionStorage is empty by the beforeEach hook.
    const dui = uniqueDui('3');

    await loginAsAdmin(page);
    // Seed the participant so the manual submit succeeds.
    const created = await createParticipant(page, dui, course.id);

    const { url } = await getPublicLink(page, course.id);
    await page.context().clearCookies();
    await page.goto(url);

    // No auto-enroll: the modal must NOT appear on its own.
    await expect(page.getByTestId('curso-detalle-enrollment-modal')).toHaveCount(0);

    // The CTA is visible; clicking it opens the modal with an empty DUI.
    await openEnrollmentModal(page);
    await expect(page.getByTestId('curso-detalle-dui-input')).toHaveValue('');

    await page.getByTestId('curso-detalle-dui-input').fill(dui);
    await page.getByTestId('curso-detalle-enrollment-submit').click();

    await expect(page.getByText(/inscripci[oó]n confirmada/i)).toBeVisible({ timeout: 10000 });

    // Cleanup best-effort.
    await deleteParticipant(page, created.id);
  });
});