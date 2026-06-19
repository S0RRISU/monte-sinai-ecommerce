import { expect, test } from '@playwright/test';

test.describe('Monte Sinai official store', () => {
  test('renders the home storefront with choose-only product cards', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByLabel('Monte Sinai', { exact: true }).getByRole('link', { name: /comprar.*produtos de limpeza/i })
    ).toBeVisible();
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

  test('filters products from the storefront search', async ({ page }) => {
    await page.goto('/produtos?q=gas');
    await expect(page.getByRole('heading', { name: /busca por "gas"/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /escolher/i }).first()).toBeVisible();
  });

  test('offers storefront app installation from the menu', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /abrir menu da loja/i }).click();
    await expect(page.getByRole('button', { name: /instalar aplicativo/i })).toBeVisible();
  });

  test('keeps the old catalog route pointing to the products page', async ({ page }) => {
    await page.goto('/catalogo?categoria=gas');
    await expect(page).toHaveURL(/\/produtos\?categoria=gas/);
    await expect(page.getByRole('heading', { name: 'Gás', exact: true })).toBeVisible();
  });

  test('renders gas product variation selection', async ({ page }) => {
    await page.goto('/produtos?categoria=gas');
    await page.getByRole('link', { name: /escolher/i }).first().click();
    await expect(page).toHaveURL(/\/produto\//);
    await expect(page.getByRole('button', { name: /supergas/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /ultragas/i })).toBeVisible();
  });

  test('renders desinfetante fragrance selection', async ({ page }) => {
    await page.goto('/produtos?q=desinfetante');
    await page.getByRole('link', { name: /escolher/i }).first().click();
    await expect(page).toHaveURL(/\/produto\//);
    await expect(page.getByRole('heading', { name: /desinfetante 2l/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /violeta/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /eucalipto/i })).toBeVisible();
  });

  test('renders the secondary customer pages', async ({ page }) => {
    await page.goto('/carrinho');
    await expect(page.getByRole('heading', { name: /seu carrinho est/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /explorar produtos/i })).toBeVisible();

    await page.goto('/pedidos');
    await expect(page.getByRole('heading', { name: /acompanhe seu pedido em tempo real/i })).toBeVisible();

    await page.goto('/conta');
    await expect(page.getByRole('heading', { name: /entre na sua conta monte sinai/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /entrar agora/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /configuracoes/i })).toBeVisible();
    await expect(page.getByText(/painel administrativo|abrir painel|acesso do painel/i)).toHaveCount(0);

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /entre na sua area monte sinai/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^entrar$/i }).last()).toBeVisible();

    await page.goto('/configuracoes');
    await expect(page.getByRole('heading', { name: /configuracoes/i })).toBeVisible();
    await expect(page.getByRole('radio', { name: /sistema/i })).toBeVisible();
    await expect(page.getByText(/painel administrativo|abrir painel|acesso do painel/i)).toHaveCount(0);
  });
});
