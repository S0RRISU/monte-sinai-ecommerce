import Link from 'next/link';
import { Heart } from 'lucide-react';
import { money, type Product } from '@/lib/store-data';

type ProductCardProps = {
  product: Product;
  compact?: boolean;
};

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const discount = product.oldPrice ? Math.round(100 - (product.price / product.oldPrice) * 100) : 0;
  const unavailable = product.unavailable || product.canBuy === false;

  return (
    <article className={`product-card ${compact ? 'is-compact' : ''} ${unavailable ? 'is-unavailable' : ''}`}>
      <Link href={`/produto/${product.slug}`} className="product-image-wrap" aria-label={`Escolher ${product.name}`}>
        {discount ? <span className="discount-badge">-{discount}%</span> : null}
        {unavailable ? <span className="discount-badge is-muted">Indisponivel</span> : null}
        <span className="favorite-button" aria-hidden="true">
          <Heart className="size-4" />
        </span>
        <img src={product.image} alt={product.name} />
      </Link>
      <div className="product-card-body">
        <span className="product-category">{product.categoryLabel}</span>
        <h2>{product.shortName}</h2>
        <p>{product.unit}</p>
        <div className="price-row">
          <strong>{money(product.price)}</strong>
          {product.oldPrice ? <del>{money(product.oldPrice)}</del> : null}
        </div>
        <Link className="choose-button" href={`/produto/${product.slug}`}>
          {unavailable ? 'Ver produto' : 'Escolher'}
        </Link>
      </div>
    </article>
  );
}
