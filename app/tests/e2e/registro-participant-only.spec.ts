import { expect, test } from '@playwright/test'

/**
 * Dedicated E2E for the participant-only registration policy.
 *
 * Verifies:
 * - The public registration form shows a banner explaining the
 *   audience.
 * - The form does NOT expose a `funcion` <select> — it's a
 *   read-only display that always reads "Participante".
 * - The form's submission sends `role_function: 'Participante'`
 *   regardless of what the user does in step 3.
 * - After submit, the success page shows a participant code.
 *
 * The POST to /api/public/participants is intercepted and mocked
 * so the test stays focused on UI behavior and doesn't depend on
 * backend state (seeded courses, duplicate DUI checks, etc.).
 */
test.describe('Public registration — participant only', () => {
  test('form is participant-only and submits with role_function=Participante', async ({ page }) => {
    let capturedRoleFunction: string | undefined

    await page.route('**/api/public/participants', async (route) => {
      const req = route.request()
      try {
        const body = req.postDataJSON() as { role_function?: string }
        capturedRoleFunction = body.role_function
      } catch {
        // ignore — assertions below cover the failure mode
      }
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 42,
            participant_code: 'P-PARTICIPANT-001',
            full_name: 'Carmen Participant',
            document_number: '12345678-9',
            birth_date: '1995-05-20',
            gender: 'Femenino',
            phone_country: 'El Salvador',
            phone_dial_code: '+503',
            phone_number: '7000-0000',
            phone: '+503 7000-0000',
            email: 'carmen.participant@example.com',
            address: 'Colonia Escalón',
            municipality: 'San Salvador',
            department: 'San Salvador',
            district: '',
            organization: 'Test Org',
            role_function: 'Participante',
            education_level: '',
            program: '',
            status: 'Pendiente',
            lifecycle_state: 'pending',
            deleted_at: null,
            deleted_by: null,
            notes: '',
            consent: true,
            created_by: 1,
            updated_by: 1,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        }),
      })
    })

    await page.goto('/#/registro')

    // Banner is visible immediately on step 1.
    await expect(page.getByTestId('registro-participant-only-banner')).toBeVisible()
    await expect(page.getByTestId('registro-participant-only-banner')).toContainText(/participantes/i)
    await expect(page.getByTestId('registro-participant-only-banner')).toContainText(/administrador|panel de control/i)

    // Sidebar heading.
    await expect(page.getByRole('heading', { name: /registro de participantes/i })).toBeVisible()

    // No <select name="funcion"> anywhere on step 1.
    expect(await page.locator('select[name="funcion"]').count()).toBe(0)

    // Fill step 1.
    const stepOneTextboxes = page.getByRole('textbox')
    const stepOneComboboxes = page.getByRole('combobox')
    await stepOneTextboxes.nth(0).fill('Carmen Participant')
    await stepOneTextboxes.nth(1).fill('12345678-9')
    await stepOneTextboxes.nth(2).fill('1995-05-20')
    await stepOneComboboxes.nth(0).selectOption({ label: 'Femenino' })
    await page.getByRole('button', { name: /^siguiente$/i }).click()

    // Fill step 2.
    const stepTwoTextboxes = page.getByRole('textbox')
    const stepTwoComboboxes = page.getByRole('combobox')
    await stepTwoTextboxes.nth(0).fill('+503')
    await stepTwoTextboxes.nth(1).fill('7000-0000')
    await stepTwoTextboxes.nth(2).fill('carmen.participant@example.com')
    await stepTwoTextboxes.nth(3).fill('Colonia Escalón')
    await stepTwoTextboxes.nth(4).fill('San Salvador')
    await stepTwoComboboxes.nth(0).selectOption({ label: 'San Salvador' })
    await stepTwoComboboxes.nth(1).selectOption({ label: 'San Salvador' })
    await page.getByRole('button', { name: /^siguiente$/i }).click()

    // Step 3 — the read-only role field is visible, no funcion select.
    await expect(page.getByTestId('registro-role-readonly')).toContainText('Participante')
    expect(await page.locator('select[name="funcion"]').count()).toBe(0)

    // Banner is still visible on step 3.
    await expect(page.getByTestId('registro-participant-only-banner')).toBeVisible()

    // Fill step 3 fields that still exist. (No need to pick a course — the
    // mock route short-circuits the POST before any course lookup.)
    await page.getByLabel(/entidad/i).fill('Test Org')
    await page.locator('input[name="autorizaDatos"]').check()

    // Submit the form.
    await page.getByRole('button', { name: /confirmar registro/i }).click()

    // The captured payload must declare participant role.
    expect(capturedRoleFunction).toBe('Participante')

    // The success view renders with a code.
    await expect(page.getByRole('heading', { name: /registro exitoso/i })).toBeVisible()
    await expect(page.getByText('P-PARTICIPANT-001')).toBeVisible()
  })
})