import { test } from '@playwright/test';

const screens = [
  { name: 'mobile-home', path: '/', width: 390, height: 844, fullPage: false },
  { name: 'mobile-products', path: '/produtos', width: 390, height: 844, fullPage: false },
  { name: 'mobile-products-gas', path: '/produtos?categoria=gas', width: 390, height: 844, fullPage: false },
  { name: 'mobile-cart', path: '/carrinho', width: 390, height: 844, fullPage: false },
  { name: 'mobile-orders', path: '/pedidos', width: 390, height: 844, fullPage: false },
  { name: 'mobile-account', path: '/conta', width: 390, height: 844, fullPage: false },
  { name: 'mobile-login', path: '/login', width: 390, height: 844, fullPage: false },
  { name: 'mobile-settings', path: '/configuracoes', width: 390, height: 844, fullPage: false },
  { name: 'tablet-home', path: '/', width: 768, height: 1024 },
  { name: 'desktop-home', path: '/', width: 1440, height: 900 },
  { name: 'desktop-products', path: '/produtos', width: 1440, height: 900 },
  { name: 'wide-home', path: '/', width: 1920, height: 1080 }
];

test.describe('Monte Sinai visual screenshots', () => {
  for (const screen of screens) {
    test(screen.name, async ({ page }) => {
      await page.setViewportSize({ width: screen.width, height: screen.height });
      await page.goto(screen.path);
      if (screen.path === '/conta') {
        await page.getByRole('link', { name: /entrar agora/i }).waitFor({ state: 'visible' });
      }
      if (screen.path === '/login') {
        await page.getByRole('heading', { name: /entre na sua area monte sinai/i }).waitFor({ state: 'visible' });
      }
      await page.screenshot({ path: `test-results/screenshots/${screen.name}.png`, fullPage: screen.fullPage ?? true, caret: 'initial' });
    });
  }
});
