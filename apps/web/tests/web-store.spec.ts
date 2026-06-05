import { expect, test } from '@playwright/test';

test.describe('Monte Sinai official store', () => {
  test('renders the home storefront with choose-only product cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /comprar água, gás e limpeza/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /escolher/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /adicionar/i })).toHaveCount(0);
  });

  test('renders product page and keeps cards as escolher links', async ({ page }) => {
    await page.goto('/produtos');
    await expect(page.getByRole('heading', { name: /todos os produtos/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /escolher/i }).first()).toBeVisible();
    await page.getByRole('link', { name: /escolher/i }).first().click();
    await expect(page).toHaveURL(/\/produto\//);
  });

  test('keeps the old catalog route pointing to the products page', async ({ page }) => {
    await page.goto('/catalogo?categoria=gas');
    await expect(page).toHaveURL(/\/produtos\?categoria=gas/);
    await expect(page.getByRole('heading', { name: 'Gás', exact: true })).toBeVisible();
  });

  test('renders gas product variation selection', async ({ page }) => {
    await page.goto('/produto/gas-p13');
    await expect(page.getByRole('heading', { name: /g.s p13/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /supergas/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /ultragas/i })).toBeVisible();
  });

  test('renders desinfetante fragrance selection', async ({ page }) => {
    await page.goto('/produto/desinfetante-2l');
    await expect(page.getByRole('heading', { name: /desinfetante 2l/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /violeta/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /eucalipto/i })).toBeVisible();
  });

  test('renders the secondary customer pages', async ({ page }) => {
    await page.goto('/carrinho');
    await expect(page.getByRole('heading', { name: /seu carrinho est/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /ver produtos/i })).toBeVisible();

    await page.goto('/pedidos');
    await expect(page.getByRole('heading', { name: /acompanhe suas compras/i })).toBeVisible();

    await page.goto('/conta');
    await expect(page.getByRole('heading', { name: /minha conta/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /configurações da conta/i })).toBeVisible();

    await page.goto('/configuracoes');
    await expect(page.getByRole('heading', { name: /configurações/i })).toBeVisible();
    await expect(page.getByRole('radio', { name: /sistema/i })).toBeVisible();
  });
});
