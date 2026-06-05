import { CheckoutPageContent } from '@/components/store/checkout-page-content';
import { StoreShell } from '@/components/store/store-shell';
import { getStorefrontConfig } from '@/lib/storefront-data';

export default async function CheckoutPage() {
  const siteConfig = await getStorefrontConfig();

  return (
    <StoreShell>
      <main className="store-main checkout-page">
        <CheckoutPageContent siteConfig={siteConfig} />
      </main>
    </StoreShell>
  );
}
