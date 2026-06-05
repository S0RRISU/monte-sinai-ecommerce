import { expect, test } from '@playwright/test';

test.describe('Monte Sinai admin shell', () => {
  test('renders login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /escolha a conta e entre/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /entrar no painel/i })).toBeVisible();
  });

  test('redirects protected dashboard to login without session', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
