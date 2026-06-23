import Link from 'next/link';
import Image from 'next/image';
import { Package } from 'lucide-react';
import { money, type Product } from '@/lib/store-data';
import { ProductFavoriteButton } from './product-favorite-button';

type ProductCardProps = {
  product: Product;
  compact?: boolean;
};

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const discount = product.oldPrice ? Math.round(100 - (product.price / product.oldPrice) * 100) : 0;
  const unavailable = product.unavailable || product.canBuy === false;
  const hasOptions = Boolean(product.variations?.length);
  const optionsLabel = product.category === 'gas' ? 'marcas' : 'opções';
  const usesFallback = !product.image || product.slug === 'desinfetante-2l';
  const usesOptimizedImage = product.image.startsWith('/') || product.image.includes('nnglqufeyergsgzafdek.supabase.co');
  const displayName = product.shortName?.trim() || product.name?.trim() || 'Produto';

  return (
    <article
      className={`product-card ${compact ? 'is-compact' : ''} ${unavailable ? 'is-unavailable' : ''}`}
      data-product-slug={product.slug}
    >
      <ProductFavoriteButton productSlug={product.slug} productName={product.name} />
      <Link href={`/produto/${product.slug}`} className="product-image-wrap" aria-label={`Escolher ${product.name}`}>
        {discount ? <span className="discount-badge">-{discount}%</span> : null}
        {unavailable ? <span className="discount-badge is-muted">Indisponível</span> : null}
        {hasOptions && !unavailable ? (
          <span className="product-options-badge">
            {product.variations?.length} {optionsLabel}
          </span>
        ) : null}
        {usesFallback ? (
          <span className="product-image-fallback" aria-hidden="true">
            <Package className="size-8" />
            <small>{product.categoryLabel}</small>
          </span>
        ) : (
          usesOptimizedImage ? (
            <Image
              src={product.image}
              alt={product.name}
              width={480}
              height={480}
              sizes={compact
                ? '(max-width: 680px) 46vw, (max-width: 1100px) 28vw, 16vw'
                : '(max-width: 520px) 46vw, (max-width: 900px) 30vw, (max-width: 1400px) 18vw, 14vw'}
              quality={68}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <img src={product.image} alt={product.name} loading="lazy" decoding="async" fetchPriority="low" />
          )
        )}
      </Link>
      <div className="product-card-body">
        <h2 className="product-title">
          <Link href={`/produto/${product.slug}`}>{displayName}</Link>
        </h2>
        <span className="product-category">{product.categoryLabel}</span>
        <p>{hasOptions ? 'Escolha antes de comprar' : product.unit}</p>
        <div className="price-row">
          {hasOptions ? <span>A partir de</span> : null}
          <strong>{money(product.price)}</strong>
          {product.oldPrice ? <del>{money(product.oldPrice)}</del> : null}
        </div>
        <Link className="choose-button" href={`/produto/${product.slug}`}>
          {unavailable ? 'Ver produto' : hasOptions ? 'Ver opções' : 'Escolher'}
        </Link>
      </div>
    </article>
  );
}
