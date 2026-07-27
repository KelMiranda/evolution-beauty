import { expect, test } from '@playwright/test'

/**
 * Public registration happy-path coverage (PR4 housekeeping).
 *
 * Replaces the original participant-only fixture, which asserted the
 * pre-PR2 `registro-participant-only-banner` / `registro-role-readonly`
 * UI chrome that PR2 removed in favor of the role matrix. The new flow:
 *
 *   step 1: pick Participante (or Facilitador)
 *   step 2: phone + email + address
 *   step 3: entity + consent + submit
 *
 * The POST to /api/public/participants is intercepted so the test stays
 * focused on UI behavior and doesn't depend on the current seed state.
 */
test.describe('Public registration happy path', () => {
  test('submits a Participante registration end-to-end', async ({ page }) => {
    let capturedRoleFunction: string | undefined
    let capturedDui: string | undefined

    const uniqueDui = `${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 10)}`
      .padStart(10, '0')
      .slice(-10)

    await page.route('**/api/public/participants', async (route) => {
      const req = route.request()
      try {
        const body = req.postDataJSON() as { role_function?: string; document_number?: string }
        capturedRoleFunction = body.role_function
        capturedDui = body.document_number
      } catch {
        // The assertions below cover the failure mode.
      }
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 42,
            participant_code: 'P-PARTICIPANT-PR4',
            full_name: 'Carmen Participante',
            document_number: uniqueDui,
            birth_date: '1995-05-20',
            gender: 'Femenino',
            phone_country: 'El Salvador',
            phone_dial_code: '+503',
            phone_number: '7000-0000',
            phone: '+503 7000-0000',
            email: 'carmen.participante@example.com',
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

    // The new role-aware banner is visible immediately on step 1.
    await expect(page.getByTestId('registro-role-banner')).toBeVisible()
    await expect(page.getByRole('heading', { name: /registro de participantes/i })).toBeVisible()

    // Step 1 — personal data + role selector.
    const stepOneTextboxes = page.getByRole('textbox')
    const stepOneComboboxes = page.getByRole('combobox')
    await stepOneTextboxes.nth(0).fill('Carmen Participante')
    await stepOneTextboxes.nth(1).fill(uniqueDui)
    await stepOneTextboxes.nth(2).fill('1995-05-20')
    await stepOneComboboxes.nth(0).selectOption({ label: 'Femenino' })
    // The `funcion` selector is the next combobox on step 1.
    await page.locator('select[name="rol-en-acoes"]').selectOption({ label: 'Participante' })
    await page.getByRole('button', { name: /^siguiente$/i }).click()

    // Step 2 — contact + address.
    const stepTwoTextboxes = page.getByRole('textbox')
    await stepTwoTextboxes.nth(0).fill('+503')
    await stepTwoTextboxes.nth(1).fill('7000-0000')
    await stepTwoTextboxes.nth(2).fill('carmen.participante@example.com')
    await stepTwoTextboxes.nth(3).fill('Colonia Escalón')
    await stepTwoTextboxes.nth(4).fill('San Salvador')
    await page.locator('select[name="departamento"]').selectOption({ label: 'San Salvador' })

    const municipioSelect = page.locator('select[name="municipio"]')
    await expect(municipioSelect).toBeVisible()
    const firstMunicipio = await municipioSelect.locator('option').nth(1).getAttribute('value')
    await municipioSelect.selectOption(firstMunicipio!)

    await page.getByRole('button', { name: /^siguiente$/i }).click()

    // Step 3 — entity + consent. Participante does NOT expose curso/capacitacion
    // fields (those are Facilitador-only per the conditional-fields spec).
    await expect(page.getByLabel(/entidad/i)).toBeVisible()
    expect(await page.locator('select[name="courseId"]').count()).toBe(0)
    expect(await page.locator('textarea[name="capacitacion"]').count()).toBe(0)
    expect(await page.locator('textarea[name="observaciones"]').count()).toBe(0)

    await page.getByLabel(/entidad/i).fill('Test Org')
    await page.locator('input[name="autorizaDatos"]').check()
    await page.getByRole('button', { name: /confirmar registro/i }).click()

    // The mock route handler captured the payload — assert the public schema's
    // two-value restriction survived the round-trip.
    expect(capturedRoleFunction).toBe('Participante')
    expect(capturedDui).toBe(uniqueDui)

    await expect(page.getByRole('heading', { name: /registro exitoso/i })).toBeVisible()
    await expect(page.getByText('P-PARTICIPANT-PR4')).toBeVisible()
  })
})