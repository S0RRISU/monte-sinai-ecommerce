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

  test('shows the install invitation only on the first visit', async ({ page }) => {
    await page.goto('/');
    const installInvitation = page.getByRole('dialog', { name: /instalar aplicativo monte sinai/i });
    await expect(installInvitation).toBeVisible();
    await installInvitation.getByRole('button', { name: /agora nao/i }).click();
    await expect(installInvitation).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('dialog', { name: /instalar aplicativo monte sinai/i })).toHaveCount(0);
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

  test('refreshes the status of an order created without login', async ({ page }) => {
    let trackedStatus = 'Recebido';

    await page.addInitScript(() => {
      window.localStorage.setItem('monte-sinai-orders-v1', JSON.stringify([{
        code: 'MS-TEST-001',
        orderId: '00000000-0000-0000-0000-000000000001',
        createdAt: '2026-06-23T12:00:00.000Z',
        customerName: 'Cliente visitante',
        customerPhone: '11999999999',
        address: 'Rua de teste, 10',
        payment: 'Pix na entrega',
        status: 'Recebido',
        paymentStatus: 'Pendente',
        subtotal: 15,
        delivery: 0,
        discount: 0,
        total: 15,
        items: []
      }]));
    });

    await page.route('**/rest/v1/rpc/track_order', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'MS-TEST-001',
          uuid: '00000000-0000-0000-0000-000000000001',
          createdAt: '2026-06-23T12:00:00.000Z',
          status: trackedStatus,
          confirmed: true,
          payment: 'Pix na entrega',
          paymentStatus: 'Pendente',
          total: 15,
          customer: {
            name: 'Cliente visitante',
            phone: '11999999999',
            address: 'Rua de teste, 10'
          },
          items: []
        })
      });
    });

    await page.goto('/pedidos');
    await expect(page.getByRole('heading', { name: 'Pedido #MS-TEST-001' })).toBeVisible();
    await expect(page.locator('.order-status-pill').filter({ hasText: 'Recebido' })).toBeVisible();

    trackedStatus = 'Entregue';
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(page.locator('.order-status-pill').filter({ hasText: 'Entregue' })).toBeVisible();
  });
});
