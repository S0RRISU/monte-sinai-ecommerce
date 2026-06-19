import Link from 'next/link';
import { Clock, MapPin, Truck } from 'lucide-react';
import { CartPageContent } from '@/components/store/cart-page-content';
import { ProductCard } from '@/components/store/product-card';
import { StoreShell } from '@/components/store/store-shell';
import { storefrontFeaturedProducts } from '@/lib/storefront-data';
import { getStorefrontConfig } from '@/lib/storefront-data';

export default async function CartPage() {
  const [suggestions, siteConfig] = await Promise.all([storefrontFeaturedProducts(), getStorefrontConfig()]);

  return (
    <StoreShell>
      <main className="store-main cart-page">
        <CartPageContent
          deliveryFee={siteConfig.deliveryFee}
          freeDeliveryMinimum={siteConfig.freeDeliveryMinimum}
          allowDelivery={siteConfig.allowDelivery}
        />

        <section className="checkout-preview">
          <article>
            <MapPin className="size-5" />
            <strong>Endereco</strong>
            <span>Voce confirma no pedido.</span>
          </article>
          <article>
            <Truck className="size-5" />
            <strong>Entrega</strong>
            <span>Rapida na regiao.</span>
          </article>
          <article>
            <Clock className="size-5" />
            <strong>Status</strong>
            <span>Acompanhe seus pedidos.</span>
          </article>
        </section>

        <section className="store-section">
          <div className="section-header">
            <h2>Para completar</h2>
            <Link href="/produtos">Ver todos</Link>
          </div>
          <div className="product-rail">
            {suggestions.slice(0, 4).map((product) => (
              <ProductCard key={product.slug} product={product} compact />
            ))}
          </div>
        </section>
      </main>
    </StoreShell>
  );
}
