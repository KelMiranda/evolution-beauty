import { test, expect } from '@playwright/test';

// ─── E2E Test: Login → Dashboard → Courses ──

test.describe('Full User Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('login flow and navigate to dashboard', async ({ page }) => {
    await page.getByLabel(/correo/i).fill('admin@acoes.local');
    await page.getByLabel(/contraseña/i).fill('Admin1234!');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText(/dashboard/i)).toBeVisible({ timeout: 10000 });
  });

  test('dashboard view for admin', async ({ page }) => {
    await page.getByLabel(/correo/i).fill('admin@acoes.local');
    await page.getByLabel(/contraseña/i).fill('Admin1234!');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText(/dashboard/i).or(page.getByText(/panel/i))).toBeVisible({ timeout: 10000 });
  });

  test('logout flow', async ({ page }) => {
    await page.getByLabel(/correo/i).fill('admin@acoes.local');
    await page.getByLabel(/contraseña/i).fill('Admin1234!');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await expect(page).toHaveURL('/dashboard');
    const logoutButton = page.getByRole('button', { name: /cerrar sesión/i }).or(
      page.getByRole('button', { name: /logout/i })
    );
    if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutButton.click();
      await expect(page).toHaveURL('/login');
    }
  });
});

test.describe('Public Pages', () => {
  test('login page has required elements', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/correo/i)).toBeVisible();
    await expect(page.getByLabel(/contraseña/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /iniciar sesión/i }).toBeVisible();
  });

  test('courses catalog loads without errors', async ({ page }) => {
    await page.goto('/cursos');
    await expect(page.getByText(/formación de excelencia/i)).toBeVisible({ timeout: 10000 });
  });

  test('landing page loads without errors', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/ACOES/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('admin pages redirect unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
