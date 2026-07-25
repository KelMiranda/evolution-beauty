import { test, expect } from '@playwright/test';

test.describe('Public course detail page', () => {
  test('loads the test course without redirecting away', async ({ page }) => {
    await page.goto('/#/cursos/8');

    await expect(page).toHaveURL(/#\/cursos\/8$/);
    await expect(page.getByRole('heading', { name: /prueba de colorimetría/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByAltText(/prueba de colorimetría/i)).toBeVisible();
    await expect(page.getByText(/facilitador:/i)).toBeVisible();
    await expect(page.getByText(/no se pudo cargar el curso/i)).toHaveCount(0);
  });
});
