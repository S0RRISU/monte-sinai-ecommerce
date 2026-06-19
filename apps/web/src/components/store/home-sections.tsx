import Link from 'next/link';
import {
  ChevronRight,
  Droplets,
  Flame,
  Headphones,
  LockKeyhole,
  Sparkles,
  ShoppingCart,
  Truck
} from 'lucide-react';
import type { Product } from '@/lib/store-data';
import { getStorefrontConfig, storefrontFeaturedProducts, storefrontOfferProducts } from '@/lib/storefront-data';
import { visibleStoreCategories } from '@/lib/site-config';
import { CategoryIcon } from './category-icon';
import { ProductCard } from './product-card';

export async function HomeSections() {
  const [config, featuredProducts, offerProducts] = await Promise.all([
    getStorefrontConfig(),
    storefrontFeaturedProducts(),
    storefrontOfferProducts()
  ]);

  return (
    <main className="store-main">
      <HeroSection />
      <CategoryTiles />
      {config.showFeaturedSection ? <ProductRail title="Mais pedidos" href="/produtos" products={featuredProducts} /> : null}
      {config.showOffersSection ? (
        <>
          <OfferBand />
          <ProductRail title="Ofertas da semana" href="/produtos?categoria=ofertas" products={offerProducts} />
        </>
      ) : null}
      <HomeFeatureCards />
      <BenefitsStrip />
    </main>
  );
}

function HeroSection() {
  return (
    <section className="hero-section home-banner-hero" aria-label="Monte Sinai">
      <Link href="/produtos" className="home-banner-link" aria-label="Comprar água, gás e produtos de limpeza">
        <picture>
          <source media="(max-width: 680px)" srcSet="/hero/monte-sinai-hero-mobile.png" />
          <source media="(max-width: 1024px)" srcSet="/hero/monte-sinai-hero-tablet.png" />
          <img src="/hero/monte-sinai-hero-desktop.png" alt="Monte Sinai: água, gás e limpeza na sua porta" />
        </picture>
        <span className="home-banner-kicker">
          <Sparkles className="size-4" />
          Loja online
        </span>
        <span className="hero-image-cta home-banner-cta" aria-hidden="true">
          <span className="hero-image-cta-icon">
            <ShoppingCart className="size-5" />
          </span>
          Comprar agora
        </span>
      </Link>
    </section>
  );
}

function HomeFeatureCards() {
  const features = [
    { icon: Droplets, title: 'Água 20L', text: 'Reposição para casa, comércio e rotina.' },
    { icon: Flame, title: 'Gás P13', text: 'Pedido direto com acompanhamento do status.' },
    { icon: Sparkles, title: 'Limpeza', text: 'Produtos essenciais em uma compra só.' }
  ];

  return (
    <section className="home-feature-cards" aria-label="Destaques da loja">
      {features.map((feature) => (
        <Link key={feature.title} href="/produtos">
          <feature.icon className="size-6" />
          <span>
            <strong>{feature.title}</strong>
            <small>{feature.text}</small>
          </span>
          <ChevronRight className="size-4" />
        </Link>
      ))}
    </section>
  );
}

function BenefitsStrip() {
  const benefits = [
    { icon: Truck, title: 'Entrega local', text: 'Atendimento rápido na região' },
    { icon: Headphones, title: 'Atendimento direto', text: 'Você fala com a loja' },
    { icon: LockKeyhole, title: 'Compra segura', text: 'Seus dados protegidos' }
  ];

  return (
    <section className="benefits-strip" aria-label="Benefícios">
      {benefits.map((benefit) => (
        <article key={benefit.title}>
          <benefit.icon className="size-6" />
          <span>
            <strong>{benefit.title}</strong>
            <small>{benefit.text}</small>
          </span>
        </article>
      ))}
    </section>
  );
}

function ProductRail({ title, href, products }: { title: string; href: string; products: Product[] }) {
  return (
    <section className="store-section">
      <SectionHeader title={title} href={href} />
      <div className="product-rail">
        {products.map((product) => (
          <ProductCard key={product.slug} product={product} compact />
        ))}
      </div>
    </section>
  );
}

function OfferBand() {
  return (
    <section className="combo-band">
      <Link href="/produtos?categoria=ofertas" className="combo-image-link" aria-label="Pedir produtos Monte Sinai pelo WhatsApp">
        <img src="/hero/monte-sinai-offer-slim.png" alt="Tudo o que sua casa precisa, entregue rápido" />
      </Link>
    </section>
  );
}

export async function CategoryTiles() {
  const config = await getStorefrontConfig();
  const visibleCategories = visibleStoreCategories(config);

  return (
    <section className="category-tiles" aria-label="Categorias">
      {visibleCategories.map((category) => (
        <Link key={category.id} href={`/produtos?categoria=${category.id}`}>
          <CategoryIcon category={category.id} />
          <span>{category.label}</span>
        </Link>
      ))}
    </section>
  );
}

export function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      <Link href={href}>
        Ver todos
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}
