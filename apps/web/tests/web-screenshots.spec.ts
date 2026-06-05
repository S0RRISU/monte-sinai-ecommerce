import { test } from '@playwright/test';

const screens = [
  { name: 'mobile-home', path: '/', width: 390, height: 844 },
  { name: 'mobile-products', path: '/produtos', width: 390, height: 844 },
  { name: 'mobile-product-gas', path: '/produto/gas-p13', width: 390, height: 844 },
  { name: 'mobile-cart', path: '/carrinho', width: 390, height: 844 },
  { name: 'mobile-orders', path: '/pedidos', width: 390, height: 844 },
  { name: 'mobile-account', path: '/conta', width: 390, height: 844 },
  { name: 'mobile-settings', path: '/configuracoes', width: 390, height: 844 },
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
      await page.screenshot({ path: `test-results/screenshots/${screen.name}.png`, fullPage: true });
    });
  }
});
