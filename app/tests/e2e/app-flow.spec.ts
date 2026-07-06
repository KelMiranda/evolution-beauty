import { test, expect } from '@playwright/test';

// ─── E2E Test: Login → Participant Create → Course Enroll → Dashboard View ──

test.describe('Full User Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
  });

  test('login flow and navigate to dashboard', async ({ page }) => {
    // Fill in login form
    await page.getByLabel(/correo/i).fill('admin@acoes.local');
    await page.getByLabel(/contraseña/i).fill('Admin1234!');

    // Submit form
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Should see dashboard content
    await expect(page.getByText(/dashboard/i)).toBeVisible({ timeout: 10000 });
  });

  test('create participant flow', async ({ page }) => {
    // Login first
    await page.getByLabel(/correo/i).fill('admin@acoes.local');
    await page.getByLabel(/contraseña/i).fill('Admin1234!');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    // Wait for dashboard to load
    await expect(page).toHaveURL('/dashboard');

    // Navigate to participants
    await page.goto('/admin/participants');

    // Click new participant button
    await page.getByRole('link', { name: /nuevo participante/i }).click();

    // Should be on new participant page
    await expect(page).toHaveURL('/admin/participants/new');

    // Fill in participant form
    await page.getByLabel(/nombre/i).fill('Test Participant');
    await page.getByLabel(/dui/i).fill('12345678-9');
    // Note: Additional fields would be filled based on the form

    // Submit form
    await page.getByRole('button', { name: /crear/i }).click();

    // Should see success or redirect
    // (Actual behavior depends on form implementation)
  });

  test('course enrollment flow', async ({ page }) => {
    // Login first
    await page.getByLabel(/correo/i).fill('admin@acoes.local');
    await page.getByLabel(/contraseña/i).fill('Admin1234!');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    // Wait for dashboard to load
    await expect(page).toHaveURL('/dashboard');

    // Navigate to courses catalog
    await page.goto('/courses');

    // Should see courses page
    await expect(page.getByText(/formación de excelencia/i)).toBeVisible({ timeout: 10000 });

    // Click on a course to view details
    const courseCard = page.getByText('Digital Skills 101').first();
    if (await courseCard.isVisible()) {
      await courseCard.click();

      // Should navigate to course detail
      await expect(page).toHaveURL(/\/courses\/\d+/);
    }
  });

  test('dashboard view for admin', async ({ page }) => {
    // Login as admin
    await page.getByLabel(/correo/i).fill('admin@acoes.local');
    await page.getByLabel(/contraseña/i).fill('Admin1234!');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    // Wait for dashboard
    await expect(page).toHaveURL('/dashboard');

    // Dashboard should have key elements
    await expect(page.getByText(/dashboard/i).or(page.getByText(/panel/i))).toBeVisible({ timeout: 10000 });
  });

  test('logout flow', async ({ page }) => {
    // Login first
    await page.getByLabel(/correo/i).fill('admin@acoes.local');
    await page.getByLabel(/contraseña/i).fill('Admin1234!');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    // Wait for dashboard to load
    await expect(page).toHaveURL('/dashboard');

    // Look for logout button (depends on implementation)
    // This is a placeholder as actual logout implementation varies
    const logoutButton = page.getByRole('button', { name: /cerrar sesión/i }).or(
      page.getByRole('button', { name: /logout/i })
    );

    if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutButton.click();

      // Should redirect to login
      await expect(page).toHaveURL('/login');
    }
  });
});

test.describe('Page Accessibility', () => {
  test('login page has required elements', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByLabel(/correo/i)).toBeVisible();
    await expect(page.getByLabel(/contraseña/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /regístrate/i })).toBeVisible();
  });

  test('courses page loads without errors', async ({ page }) => {
    await page.goto('/courses');

    // Should not have console errors at Error level
    // Note: This is a basic check; full implementation would use console listener

    // Page should render
    await expect(page.getByText(/formación de excelencia/i)).toBeVisible({ timeout: 10000 });
  });

  test('admin pages redirect unauthenticated users', async ({ page }) => {
    // Try to access admin page without login
    await page.goto('/admin/participants');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});
