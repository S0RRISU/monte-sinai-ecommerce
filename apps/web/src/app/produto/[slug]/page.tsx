import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BadgeCheck, MapPin, ShieldCheck, Star } from 'lucide-react';
import { StoreShell } from '@/components/store/store-shell';
import { ProductConfigurator } from '@/components/store/product-configurator';
import { products } from '@/lib/store-data';
import { getStorefrontConfig, getStorefrontProduct } from '@/lib/storefront-data';

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const [product, siteConfig] = await Promise.all([getStorefrontProduct(slug), getStorefrontConfig()]);
  if (!product) notFound();
  const galleryImages = Array.from(new Set([product.image, ...(product.images || [])].filter(Boolean)));

  return (
    <StoreShell>
      <main className="store-main product-page">
        <Link href="/produtos" className="back-link">
          <ArrowLeft className="size-5" />
          Produtos
        </Link>

        <section className="product-hero">
          <div className="product-gallery">
            {product.badge ? <span>{product.badge}</span> : null}
            <img className="product-gallery-main" src={product.image} alt={product.name} />
            {galleryImages.length > 1 ? (
              <div className="product-gallery-thumbs" aria-label="Galeria de fotos do produto">
                {galleryImages.map((image, index) => (
                  <img key={image} src={image} alt={`${product.name} ${index + 1}`} />
                ))}
              </div>
            ) : null}
          </div>

          <div className="product-info">
            <span className="product-pill">{product.categoryLabel}</span>
            <h1>{product.name}</h1>
            <p>{product.description}</p>

            <div className="rating-row">
              <Star className="size-5" />
              <strong>{product.rating || 4.8}</strong>
              <span>Produto bem avaliado</span>
            </div>

            <ProductConfigurator
              product={product}
              storeOpen={siteConfig.storeOpen}
              allowDelivery={siteConfig.allowDelivery}
              businessHours={siteConfig.businessHours}
            />
          </div>
        </section>

        <section className="product-details-grid">
          <article>
            <ShieldCheck className="size-7" />
            <h2>Por que escolher</h2>
            <ul>
              {product.benefits.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
          </article>

          <article>
            <BadgeCheck className="size-7" />
            <h2>Onde usar</h2>
            <ul>
              {product.useCases.map((useCase) => (
                <li key={useCase}>{useCase}</li>
              ))}
            </ul>
          </article>

          <article>
            <MapPin className="size-7" />
            <h2>Entrega</h2>
            <p>Entrega local com confirmação antes de finalizar.</p>
          </article>
        </section>
      </main>
    </StoreShell>
  );
}
