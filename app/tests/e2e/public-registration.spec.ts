import { expect, test } from '@playwright/test'

test.describe('Public registration flow', () => {
  test('selects the seeded course and submits a registration', async ({ page }) => {
    const uniqueDui = `7${Date.now()}-${Math.floor(Math.random() * 9)}`.slice(0, 9) + '-' + Math.floor(Math.random() * 10)
    await page.goto('/#/registro')

    await expect(page.getByRole('heading', { name: /registro al directorio acoes/i })).toBeVisible()

    const stepOneTextboxes = page.getByRole('textbox')
    const stepOneComboboxes = page.getByRole('combobox')

    await stepOneTextboxes.nth(0).fill('Ana Test')
    await stepOneTextboxes.nth(1).fill('12345678-9')
    await stepOneTextboxes.nth(2).fill('1995-05-20')
    await stepOneComboboxes.nth(0).selectOption({ label: 'Femenino' })

    await page.getByRole('button', { name: /^siguiente$/i }).click()

    const stepTwoTextboxes = page.getByRole('textbox')
    const stepTwoComboboxes = page.getByRole('combobox')
    await stepTwoTextboxes.nth(0).fill('+503')
    await stepTwoTextboxes.nth(1).fill('7000-0000')
    await stepTwoTextboxes.nth(2).fill('ana.test@example.com')
    await stepTwoTextboxes.nth(3).fill('Colonia Escalón')
    await stepTwoTextboxes.nth(4).fill('San Salvador')
    await stepTwoComboboxes.nth(0).selectOption({ label: 'San Salvador' })
    await stepTwoComboboxes.nth(1).selectOption({ label: 'San Salvador' })

    await page.getByRole('button', { name: /^siguiente$/i }).click()

    await expect(page.getByRole('heading', { name: /información adicional/i })).toBeVisible()

    const stepThreeTextboxes = page.getByRole('textbox')
    const stepThreeComboboxes = page.getByRole('combobox')
    await page.getByLabel('Curso').selectOption({ label: 'Colorimetría Profesional' })
    await stepThreeTextboxes.nth(0).fill('Test Org')
    await stepThreeComboboxes.nth(1).selectOption({ index: 1 })
    await stepThreeTextboxes.nth(1).fill('Prueba E2E')
    await page.locator('input[name="autorizaDatos"]').check()

    await expect(page.getByLabel('Curso')).toHaveValue(/\d+/)
    await expect(page.locator('input[name="autorizaDatos"]')).toBeChecked()

    const response = await page.request.post('http://localhost:4321/api/public/participants', {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        courseId: 9,
        full_name: 'Ana Test',
        document_number: uniqueDui,
        birth_date: '1995-05-20',
        gender: 'Femenino',
        phone_country: 'El Salvador',
        phone_dial_code: '+503',
        phone_number: '7000-0000',
        phone: '+503 7000-0000',
        email: 'ana.test@example.com',
        address: 'Colonia Escalón',
        municipality: 'San Salvador',
        department: 'San Salvador',
        district: 'San Salvador',
        organization: 'Test Org',
        role_function: 'Empleado',
        education_level: '',
        program: 'Prueba E2E',
        status: 'Pendiente',
        notes: '',
        consent: true,
      }),
    })

    expect(response.status()).toBe(201)
  })
})
